import React, {useEffect} from "react";
import Notifications from "../../../shared/Notifications";
import {connect} from "react-redux";
import {removeNotificationWizardForm} from "../../../../actions/notificationActions";
import {
    checkConflicts,
    saveSchedulingInfo
} from "../../../../thunks/eventDetailsThunks";
import {
    getCaptureAgents,
    getSchedulingConflicts,
    getSchedulingProperties,
    getSchedulingSource,
    isCheckingConflicts
} from "../../../../selectors/eventDetailsSelectors";
import {getUserInformation} from "../../../../selectors/userInfoSelectors";
import {
    getCurrentLanguageInformation,
    getTimezoneOffset,
    getTimezoneString,
    hasAccess,
    initArray,
    makeTwoDigits
} from "../../../../utils/utils";
import {
    calculateDuration,
    makeDate
} from "../../../../utils/dateUtils";
import {DatePicker} from "@material-ui/pickers";
import {createTheme, ThemeProvider} from "@material-ui/core";
import {Field, Formik} from "formik";
import cn from "classnames";
import _ from 'lodash';
import {MuiPickersUtilsProvider} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import {addNotification} from "../../../../thunks/notificationThunks";
import {NOTIFICATION_CONTEXT} from "../../../../configs/modalConfig";

/**
 * This component manages the main assets tab of event details modal
 */
const EventDetailsSchedulingTab = ({ eventId, t,
                                   source, conflicts, hasSchedulingProperties, captureAgents, checkingConflicts, user,
                                   checkConflicts, saveSchedulingInfo, removeNotificationWizardForm, addNotification}) => {

    useEffect(() => {
        removeNotificationWizardForm();
        checkConflicts(eventId, source.start.date, source.end.date, source.device.id).then();
    }, []);

    // Get info about the current language and its date locale
    const currentLanguage = getCurrentLanguageInformation();

    // Make arrays of possible values for hours and minutes
    const hours = initArray(24);
    const minutes = initArray(60);

    // Get timezone offset; Checks should be performed on UTC times
    const offset = getTimezoneOffset();

    // Set timezone
    const tz = getTimezoneString(offset);

    // Style to bring date picker pop up to front
    const theme = createTheme({
        props: {
            MuiDialog: {
                style: {
                    zIndex: '2147483550',
                }
            }
        }
    });

    const hasCurrentAgentAccess = (agentId) => {
        let transformedId = agentId;
        transformedId = transformedId.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
        const roleToCheck = 'ROLE_CAPTURE_AGENT_' + transformedId;
        return hasAccess(roleToCheck, user);
    }

    // Variable and function for checking access rights
    const hasAccessRole = hasAccess("ROLE_UI_EVENTS_DETAILS_SCHEDULING_EDIT", user);
    const accessAllowed = (agentId) => {return (!checkingConflicts)  && hasCurrentAgentAccess(agentId)};

    // sets the duration in the formik
    const setDuration = (startDate, endDate, setFieldValue) => {
        const {durationHours, durationMinutes} = calculateDuration(startDate, endDate);

        setFieldValue('scheduleDurationHours', makeTwoDigits(durationHours));
        setFieldValue('scheduleDurationMinutes', makeTwoDigits(durationMinutes));
    }

    // checks if the time of the endDate is before the time of the startDate
    const isEndBeforeStart = (startDate, endDate) => {
        return (startDate.getHours() > endDate.getHours()) || ((startDate.getHours() === endDate.getHours()) && (startDate.getMinutes() > endDate.getMinutes()));
    }

    // changes the start in the formik
    const changeStart = (start, formikValues, setFieldValue) => {
        const startDate = makeDate(start.date, start.hour, start.minute);

        let endDate = makeDate(start.date, formikValues.scheduleEndHour, formikValues.scheduleEndMinute);

        if(isEndBeforeStart(startDate, endDate)){
            endDate.setDate(startDate.getDate() + 1);
        }

        setDuration(startDate, endDate, setFieldValue);
        setFieldValue('scheduleEndDate', endDate.setHours(0, 0, 0));
        setFieldValue('scheduleStartDate', startDate.setHours(0, 0, 0));

        checkConflicts(eventId, startDate, endDate, formikValues.captureAgent).then();
    };

    const changeStartDate = (value, formikValues, setFieldValue) => {
        changeStart(
            {
                date: value,
                hour: formikValues.scheduleStartHour,
                minute: formikValues.scheduleStartMinute
            },
            formikValues,
            setFieldValue
        );
    }

    const changeStartHour = async (value, formikValues, setFieldValue) => {
        changeStart(
            {
                date: formikValues.scheduleStartDate,
                hour: value,
                minute: formikValues.scheduleStartMinute
            },
            formikValues,
            setFieldValue
        );

        setFieldValue('scheduleStartHour', value);
    };

    const changeStartMinute = async (value, formikValues, setFieldValue) => {
        changeStart(
            {
                date: formikValues.scheduleStartDate,
                hour: formikValues.scheduleStartHour,
                minute: value
            },
            formikValues,
            setFieldValue
        );

        setFieldValue('scheduleStartMinute', value);
    };

    // changes the end in the formik
    const changeEnd = (end, formikValues, setFieldValue) => {
        const endDate = makeDate(formikValues.scheduleStartDate, end.hour, end.minute);

        const startDate = makeDate(formikValues.scheduleStartDate, formikValues.scheduleStartHour, formikValues.scheduleStartMinute);

        if(isEndBeforeStart(startDate, endDate)){
            endDate.setDate(startDate.getDate() + 1);
        }

        setDuration(startDate, endDate, setFieldValue);
        setFieldValue('scheduleEndDate', endDate.setHours(0,0,0));

        checkConflicts(eventId, startDate, endDate, formikValues.captureAgent).then();
    }

    const changeEndHour = async (value, formikValues, setFieldValue) => {
        changeEnd(
            {
                hour: value,
                minute: formikValues.scheduleEndMinute
            },
            formikValues,
            setFieldValue
        );

        setFieldValue('scheduleEndHour', value);
    };

    const changeEndMinute = async (value, formikValues, setFieldValue) => {
        changeEnd(
            {
                hour: formikValues.scheduleEndHour,
                minute: value
            },
            formikValues,
            setFieldValue
        );

        setFieldValue('scheduleEndMinute', value);
    };

    // changes the duration in the formik
    const changeDuration = (duration, formikValues, setFieldValue) => {

        const startDate = makeDate(formikValues.scheduleStartDate, formikValues.scheduleStartHour, formikValues.scheduleStartMinute);

        const endDate = new Date(startDate.toISOString());

        endDate.setHours(endDate.getHours() + parseInt(duration.hours));
        endDate.setMinutes(endDate.getMinutes() + parseInt(duration.minutes));

        setFieldValue('scheduleEndHour', makeTwoDigits(endDate.getHours()));
        setFieldValue('scheduleEndMinute', makeTwoDigits(endDate.getMinutes()));

        setFieldValue('scheduleEndDate', endDate.setHours(0,0,0));

        checkConflicts(eventId, startDate, endDate, formikValues.captureAgent).then();
    }

    const changeDurationHour = async (value, formikValues, setFieldValue) => {
        changeDuration(
            {
                hours: value,
                minutes: formikValues.scheduleDurationMinutes
            },
            formikValues,
            setFieldValue
        );

        setFieldValue('scheduleDurationHours', value);
    };

    const changeDurationMinute = async (value, formikValues, setFieldValue) => {
        changeDuration(
            {
                hours: formikValues.scheduleDurationHours,
                minutes: value
            },
            formikValues,
            setFieldValue
        );

        setFieldValue('scheduleDurationMinutes', value);
    };

    // finds the inputs to be displayed in the formik
    const getInputs = (deviceId) => {
        if(deviceId === source.device.id) {
            return source.device.inputs;
        } else {
            for(const agent of captureAgents){
                if(agent.id === deviceId){
                    return agent.inputs;
                }
            }
        }
    }

    // changes the inputs in the formik
    const changeInputs = (deviceId, setFieldValue) => {
        setFieldValue("captureAgent", deviceId);
        setFieldValue("inputs", []);
    }
    const filterCaptureAgents = (agent) => {
        return agent.id === source.agentId || hasCurrentAgentAccess(agent.id);
    }

    // checks validity of the formik form
    const checkValidity = (formik) => {
        if (formik.dirty && formik.isValid && hasAccessRole && accessAllowed(formik.values.captureAgent) && !(conflicts.length > 0)) {
            // check if user provided values differ from initial ones
            if (!_.isEqual(formik.values, formik.initialValues)){
                if(!_.isEqual(formik.values.inputs, formik.initialValues.inputs)){
                    return !_.isEqual(formik.values.inputs.sort(), formik.initialValues.inputs.sort());
                } else {
                    return true;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // submits the formik form
    const submitForm = async (values) => {
        const startDate = makeDate(values.scheduleStartDate, values.scheduleStartHour, values.scheduleStartMinute);
        const endDate = makeDate(values.scheduleEndDate, values.scheduleEndHour, values.scheduleEndMinute);
        checkConflicts(eventId, startDate, endDate, values.captureAgent).then(r => {
            if(r && !(conflicts.length > 0)){
                saveSchedulingInfo(eventId, values, startDate, endDate).then();
            } else {
                addNotification('error', 'EVENTS_NOT_UPDATED', -1, null, NOTIFICATION_CONTEXT);
            }
        });
    }

    // initial values of the formik form
    const getInitialValues = () =>{
        const startDate = new Date(source.start.date);
        const endDate = new Date(source.end.date);

        return {
            scheduleStartDate: startDate.setHours(0,0,0),
            scheduleStartHour: makeTwoDigits(source.start.hour),
            scheduleStartMinute: makeTwoDigits(source.start.minute),
            scheduleDurationHours: makeTwoDigits(source.duration.hour),
            scheduleDurationMinutes: makeTwoDigits(source.duration.minute),
            scheduleEndDate: endDate.setHours(0,0,0),
            scheduleEndHour: makeTwoDigits(source.end.hour),
            scheduleEndMinute: makeTwoDigits(source.end.minute),
            captureAgent: source.device.name,
            inputs: Array.from(source.device.inputMethods)
        };
    }

    return (
        <div className="modal-content">
            <div className="modal-body">
                {/* Notifications */}
                <Notifications context="not_corner"/>

                <div className="full-col">

                    {/*list of scheduling conflicts*/
                        conflicts.length > 0 && (
                        <table className="main-tbl scheduling-conflict">
                            <tbody>
                                {conflicts.map((conflict, key) => (
                                    <tr key={key}>
                                        <td>{conflict.title}</td>
                                        <td>{t('dateFormats.dateTime.medium', {dateTime: new Date(conflict.start)})}</td>
                                        <td>{t('dateFormats.dateTime.medium', {dateTime: new Date(conflict.end)})}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Scheduling configuration */
                    hasSchedulingProperties && (

                        /* Initialize form */
                        <MuiPickersUtilsProvider  utils={DateFnsUtils} locale={currentLanguage.dateLocale}>
                            <Formik
                                enableReinitialize
                                initialValues={getInitialValues()}
                                onSubmit={(values) =>
                                    submitForm(values).then()
                                }
                            >
                                {formik => (
                                    <div className="obj tbl-details">
                                        <header>
                                            <span>
                                                {t("EVENTS.EVENTS.DETAILS.SCHEDULING.CAPTION") /* Scheduling configuration */}
                                            </span>
                                        </header>
                                        <div className="obj-container">
                                            <table className="main-tbl">
                                                <tbody>
                                                    {/*time zone*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.TIMEZONE')}</td>
                                                        <td>{tz}</td>
                                                    </tr>

                                                    {/*start date*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.START_DATE')}</td>
                                                        <td>
                                                            {(hasAccessRole && accessAllowed(formik.values.captureAgent))? (
                                                                /*date picker for start date*/
                                                                <ThemeProvider theme={theme}>
                                                                    <DatePicker name="scheduleStartDate"
                                                                                value={formik.values.scheduleStartDate}
                                                                                onChange={value => changeStartDate(value, formik.values, formik.setFieldValue)}
                                                                    />
                                                                </ThemeProvider>
                                                            ):(
                                                                <>{source.start.date.toLocaleDateString(currentLanguage.dateLocale.code)}</>
                                                            )}
                                                        </td>
                                                    </tr>

                                                    {/*start time*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.START_TIME')}</td>
                                                        {hasAccessRole && (
                                                            <td>
                                                                {/*drop-down for hour*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name={"scheduleStartHour"}
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'100px'"
                                                                        onChange={event => changeStartHour(event.target.value, formik.values, formik.setFieldValue)}
                                                                        placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.HOUR')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {hours.map((h, key) => (
                                                                            <option value={makeTwoDigits(h.index)}
                                                                                    key={key}>
                                                                                {h.value}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>

                                                                {/*drop-down for minute*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name="scheduleStartMinute"
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'100px'"
                                                                        onChange={event => changeStartMinute(event.target.value, formik.values, formik.setFieldValue)}
                                                                        placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.MINUTE')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {minutes.map((m, key) => (
                                                                            <option value={makeTwoDigits(m.index)}
                                                                                    key={key}>
                                                                                {m.value}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {!hasAccessRole && (
                                                            <td>
                                                                {makeTwoDigits(source.start.hour)}:
                                                                {makeTwoDigits(source.start.minute)}
                                                            </td>
                                                        )}
                                                    </tr>

                                                    {/*duration*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.DURATION')}</td>
                                                        {hasAccessRole && (
                                                            <td>
                                                                {/*drop-down for hour*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name="scheduleDurationHours"
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'100px'"
                                                                        onChange={event => changeDurationHour(event.target.value, formik.values, formik.setFieldValue)}
                                                                        placeholder={t('WIZARD.DURATION.HOURS')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {hours.map((h, key) => (
                                                                            <option value={makeTwoDigits(h.index)}
                                                                                    key={key}>
                                                                                {h.value}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>

                                                                {/*drop-down for minute*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name="scheduleDurationMinutes"
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'100px'"
                                                                        onChange={event => changeDurationMinute(event.target.value, formik.values, formik.setFieldValue)}
                                                                        placeholder={t('WIZARD.DURATION.MINUTES')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {minutes.map((m, key) => (
                                                                            <option value={makeTwoDigits(m.index)}
                                                                                    key={key}>
                                                                                {m.value}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {!hasAccessRole && (
                                                            <td>
                                                                {makeTwoDigits(source.duration.hour)}:
                                                                {makeTwoDigits(source.duration.minute)}
                                                            </td>
                                                        )}
                                                    </tr>

                                                    {/*end time*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.END_TIME')}</td>
                                                        {hasAccessRole && (
                                                            <td>
                                                                {/*drop-down for hour*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name="scheduleEndHour"
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'100px'"
                                                                        onChange={event => changeEndHour(event.target.value, formik.values, formik.setFieldValue)}
                                                                        placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.HOUR')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {hours.map((h, key) => (
                                                                            <option value={makeTwoDigits(h.index)}
                                                                                    key={key}>
                                                                                {h.value}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>

                                                                {/*drop-down for minute*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name="scheduleEndMinute"
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'100px'"
                                                                        onChange={event => changeEndMinute(event.target.value, formik.values, formik.setFieldValue)}
                                                                        placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.MINUTE')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {minutes.map((m, key) => (
                                                                            <option value={makeTwoDigits(m.index)}
                                                                                    key={key}>
                                                                                {m.value}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>

                                                                {/*display end date if on different day to start date*/}
                                                                {(formik.values.scheduleEndDate.toString() !== formik.values.scheduleStartDate.toString()) && (
                                                                    <span>{(new Date(formik.values.scheduleEndDate)).toLocaleDateString(currentLanguage.dateLocale.code)}</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        {!hasAccessRole && (
                                                            <td>
                                                                {makeTwoDigits(source.end.hour)}:
                                                                {makeTwoDigits(source.end.minute)}
                                                                {(formik.values.scheduleEndDate.toString() !== formik.values.scheduleStartDate.toString()) && (
                                                                    <span>{(new Date(formik.values.scheduleEndDate)).toLocaleDateString(currentLanguage.dateLocale.code)}</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>

                                                    {/*capture agent (aka. room or location)*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.LOCATION')}</td>
                                                        {hasAccessRole && (
                                                            <td>
                                                                {/*drop-down for capture agents (aka. rooms or locations)*/}
                                                                <div className="chosen-container chosen-container-single">
                                                                    <Field
                                                                        className="chosen-single"
                                                                        name="captureAgent"
                                                                        as="select"
                                                                        disabled={!accessAllowed(formik.values.captureAgent)}
                                                                        data-width="'200px'"
                                                                        onChange={event => changeInputs(event.target.value, formik.setFieldValue)}
                                                                        placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.LOCATION')}
                                                                    >
                                                                        <option value="" hidden/>
                                                                        {captureAgents.filter(a => filterCaptureAgents(a)).map((ca, key) => (
                                                                            <option value={ca.name}
                                                                                    key={key}>
                                                                                {ca.name}
                                                                            </option>
                                                                        ))}
                                                                    </Field>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {!hasAccessRole && (
                                                            <td>
                                                                {source.device.name}
                                                            </td>
                                                        )}
                                                    </tr>

                                                    {/*inputs*/}
                                                    <tr>
                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.INPUTS')}</td>
                                                        <td>
                                                            {(hasAccessRole && accessAllowed(formik.values.captureAgent))? (

                                                                /*checkboxes for available inputs*/
                                                                getInputs(formik.values.captureAgent).map((inputMethod, key) => (
                                                                    <label key={key}>
                                                                        <Field name="inputs"
                                                                               type="checkbox"
                                                                               value={inputMethod.id}
                                                                        />
                                                                        {t(inputMethod.value)}
                                                                    </label>
                                                                ))
                                                            ):(
                                                                formik.values.inputs.map((input, key) => (
                                                                    <span key={key}>
                                                                        {t(getInputs(formik.values.captureAgent).find(agent => (agent.id === input)).value)}
                                                                        <br/>
                                                                    </span>
                                                                ))
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Save and cancel buttons */}
                                        {formik.dirty && (
                                            <>
                                                {/* Render buttons for updating scheduling */}
                                                <footer style={{padding: '15px'}}>
                                                    <button type="submit"
                                                            onClick={() => formik.handleSubmit()}
                                                            disabled={!checkValidity(formik)}
                                                            className={cn("submit",
                                                                {
                                                                    active: checkValidity(formik),
                                                                    inactive: !checkValidity(formik)
                                                                }
                                                            )}>
                                                        {t('SAVE') /* Save */}
                                                    </button>
                                                    <button className="cancel"
                                                            onClick={() => {
                                                                formik.resetForm({values: getInitialValues()});
                                                            }}>
                                                        {t('CANCEL') /* Cancel */}
                                                    </button>
                                                </footer>

                                                <div className="btm-spacer"/>
                                            </>
                                        )}
                                    </div>
                                )}
                            </Formik>
                        </MuiPickersUtilsProvider>
                    )}
                </div>
            </div>
        </div>
    );
}

// Getting state data out of redux store
const mapStateToProps = state => ({
    user: getUserInformation(state),
    hasSchedulingProperties: getSchedulingProperties(state),
    source: getSchedulingSource(state),
    conflicts: getSchedulingConflicts(state),
    checkingConflicts: isCheckingConflicts(state),
    captureAgents: getCaptureAgents(state)
});

// Mapping actions to dispatch
const mapDispatchToProps = dispatch => ({
    checkConflicts: (eventId, startDate, endDate, deviceId) => dispatch(checkConflicts(eventId, startDate, endDate, deviceId)),
    saveSchedulingInfo: (eventId, values, startDate, endDate) => dispatch(saveSchedulingInfo(eventId, values, startDate, endDate)),
    removeNotificationWizardForm: () => dispatch(removeNotificationWizardForm()),
    addNotification: (type, key, duration, parameter, context) => dispatch(addNotification(type, key, duration, parameter, context)),
});

export default connect(mapStateToProps, mapDispatchToProps)(EventDetailsSchedulingTab);
