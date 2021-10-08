import React      from 'react';
import ReactDOM   from 'react-dom';
import {connect}  from 'react-redux';
import classNames from 'classnames';
import _          from 'lodash';

import SessionActions from 'actions/session-actions';
import API         from 'lib-app/api-call';
import focus       from 'lib-core/focus';
import i18n        from 'lib-app/i18n';

import PasswordRecovery from 'app-components/password-recovery';
import SubmitButton     from 'core-components/submit-button';
import Button           from 'core-components/button';
import Form             from 'core-components/form';
import FormField        from 'core-components/form-field';
import Widget           from 'core-components/widget';
import WidgetTransition from 'core-components/widget-transition';
import Message          from 'core-components/message';
import Loading          from 'core-components/loading';

const UNVERIFIED_USER_STEP = 0;
const LOADING_STEP = 1;
const REQUEST_RESULT_STEP = 2;

class MainHomePageLoginWidget extends React.Component {

    state = {
        sideToShow: 'front',
        loginFormErrors: {},
        recoverFormErrors: {},
        recoverSent: false,
        loadingLogin: false,
        loadingRecover: false,
        reSendEMailVerificationLoading: false,
        reSendEmailVerificationStep: 0,
        reSendEmailVerificationMessage: ""
    };

    componentDidUpdate(prevProps) {
        if (!prevProps.session.failed && this.props.session.failed) {
            this.refs.loginForm.refs.password.focus();
        }
    }

    render() {
        return (
            <WidgetTransition sideToShow={this.state.sideToShow} className={classNames('login-widget__container', this.props.className)}>
                {this.renderLogin()}
                {this.renderPasswordRecovery()}
            </WidgetTransition>
        );
    }

    renderLogin() {
        return (
            <Widget className="main-home-page__widget" title={i18n('LOG_IN')} ref="loginWidget">
                <Form {...this.getLoginFormProps()}>
                    <div className="login-widget__inputs">
                        <FormField placeholder={i18n('EMAIL_LOWERCASE')} name="email" className="login-widget__input" validation="EMAIL" required/>
                        <FormField placeholder={i18n('PASSWORD_LOWERCASE')} name="password" className="login-widget__input" required fieldProps={{password: true}}/>
                        <FormField name="remember" label={i18n('REMEMBER_ME')} className="login-widget__input" field="checkbox"/>
                    </div>
                    <div className="login-widget__submit-button">
                        <SubmitButton type="primary">{i18n('LOG_IN')}</SubmitButton>
                    </div>
                </Form>
                <div className="main-home-page__link-buttons-container">
                    <Button className="login-widget__forgot-password" type="link" onClick={this.onForgotPasswordClick.bind(this)} onMouseDown={(event) => {event.preventDefault()}}>
                        {i18n('FORGOT_PASSWORD')}
                    </Button>
                    {this.renderReSendEmailVerificationSection()}
                </div>
            </Widget>
        );
    }

    renderReSendEmailVerificationSection() {
        if(this.props.session.failMessage === 'UNVERIFIED_USER') {
            switch (this.state.reSendEmailVerificationStep) {
                case UNVERIFIED_USER_STEP:
                    return (
                        <Button className="login-widget__resend-verification-token" type="link" onClick={this.onReSendEmailVerificationClick.bind(this)}>
                            {i18n('RESEND_EMAIL_VERIFICATION')}
                        </Button>
                    )

                case LOADING_STEP:
                    return <Loading />

                case REQUEST_RESULT_STEP:
                    return (
                        (this.state.emailVerificationMessage === "success") ?
                            <Message className="login-widget__resend-email-verification-success" type="success" leftAligned>
                                {i18n('RESEND_EMAIL_VERIFICATION_SUCCESS')}
                            </Message> :
                            <Message className="login-widget__resend-email-verification-fail" type="error" leftAligned>
                                {i18n('RESEND_EMAIL_VERIFICATION_FAIL')}
                            </Message>
                    )
            }
        } else {
            return null
        }
    }

    renderPasswordRecovery() {
        return (
            <PasswordRecovery ref="passwordRecovery" recoverSent={this.state.recoverSent} formProps={this.getRecoverFormProps()} onBackToLoginClick={this.onBackToLoginClick.bind(this)}/>
        );
    }

    renderRecoverStatus() {
        let status = null;

        if (this.state.recoverSent) {
            status = (
                <Message className="login-widget__message" type="info" leftAligned>
                    {i18n('RECOVER_SENT')}
                </Message>
            );
        }

        return status;
    }

    getLoginFormProps() {
        return {
            loading: this.props.session.pending,
            className: 'login-widget__form',
            ref: 'loginForm',
            onSubmit: this.onLoginFormSubmit.bind(this),
            errors: this.getLoginFormErrors(),
            onValidateErrors: this.onLoginFormErrorsValidation.bind(this)
        };
    }

    getRecoverFormProps() {
        return {
            loading: this.state.loadingRecover,
            className: 'login-widget__form',
            ref: 'recoverForm',
            onSubmit: this.onForgotPasswordSubmit.bind(this),
            errors: this.state.recoverFormErrors,
            onValidateErrors: this.onRecoverFormErrorsValidation.bind(this)
        };
    }

    getLoginFormErrors() {
        let errors = _.extend({}, this.state.loginFormErrors);

        if (this.props.session.failed) {
            if (this.props.session.failMessage === 'INVALID_CREDENTIALS') {
                errors.password = i18n('ERROR_PASSWORD');
            } else if (this.props.session.failMessage === 'UNVERIFIED_USER') {
                errors.email = i18n('UNVERIFIED_EMAIL');
            } else if (this.props.session.failMessage === 'USER_DISABLED') {
                errors.email = i18n('USER_DISABLED');
            }
        }

        return errors;
    }

    onLoginFormSubmit(formState) {
        this.setState({
            loadingRecover: true,
            recoverSent: false,
            reSendEmailVerificationStep: UNVERIFIED_USER_STEP
        })
        this.props.dispatch(SessionActions.login(formState));
    }

    onForgotPasswordSubmit(formState) {
        this.setState({
            loadingRecover: true,
            recoverSent: false
        });

        API.call({
            path: '/user/send-recover-password',
            data: formState
        }).then(this.onRecoverPasswordSent.bind(this)).catch(this.onRecoverPasswordFail.bind(this));
    }

    onLoginFormErrorsValidation(errors) {
        this.setState({
            loginFormErrors: errors
        });
    }

    onRecoverFormErrorsValidation(errors) {
        this.setState({
            recoverFormErrors: errors
        });
    }

    onForgotPasswordClick() {
        this.setState({
            sideToShow: 'back'
        });
    }

    onBackToLoginClick() {
        this.setState({
            sideToShow: 'front',
            recoverSent: false
        });
    }

    onRecoverPasswordSent() {
        this.setState({
            loadingRecover: false,
            recoverSent: true
        });
    }

    onRecoverPasswordFail() {
        this.setState({
            loadingRecover: false,
            recoverFormErrors: {
                email: i18n('EMAIL_NOT_EXIST')
            }
        }, () => this.refs.passwordRecovery.focusEmail());
    }

    onReSendEmailVerificationClick() {
        this.setState({
            reSendEmailVerificationStep: LOADING_STEP,
        })

        API.call({
            path: '/user/resend-email-verification',
            data: {
                email: this.state.email
            }
        }).then(() => {
            this.setState({
                reSendEmailVerificationStep: REQUEST_RESULT_STEP,
                reSendEMailVerificationMessage: 'success'
            })
        }).catch(() => {
            this.setState({
                reSendEmailVerificationStep: REQUEST_RESULT_STEP,
                reSendEMailVerificationMessage: 'error'
            })
        });
    }
}


export default connect((store) => {
    return {
        session: store.session
    };
})(MainHomePageLoginWidget);