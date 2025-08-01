import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Formik } from "formik";
import { Field } from "./Field";
import TermsOfUsePage from "./modals/TermsOfUsePage";
import { countries, states, systemTypes } from "../../configs/adopterRegistrationConfig";
import cn from "classnames";
import { AdopterRegistrationSchema } from "../../utils/validate";
import {
	Registration,
	deleteAdopterRegistration,
	fetchAdopterRegistration,
	fetchAdopterStatisticsSummary,
	postRegistration,
} from "../../utils/adopterRegistrationUtils";
import ModalContent from "./modals/ModalContent";
import { Modal, ModalHandle } from "./modals/Modal";
import { ParseKeys } from "i18next";

/**
 * This component renders the adopter registration modal. This modal has various states.
 */
const RegistrationModal = ({
	modalRef,
}: {
	modalRef: React.RefObject<ModalHandle | null>
}) => {
	const { t } = useTranslation();

	return (
		<Modal
			header={t("ADOPTER_REGISTRATION.MODAL.CAPTION")}
			classId="registration-modal"
			className="modal active modal-open modal-animation"
			ref={modalRef}
		>
			<RegistrationModalContent />
		</Modal>
	);
};

const RegistrationModalContent = () => {
	const { t } = useTranslation();

	// current state of the modal that is shown
	const [state, setState] = useState<keyof typeof states>("information");
	// initial values for Formik
	const [initialValues, setInitialValues] = useState<Registration & { agreedToPolicy: boolean, registered: boolean }>({
		contactMe: false,
		systemType: "",
		allowsStatistics: false,
		allowsErrorReports: false,
		organisationName: "",
		departmentName: "",
		country: "",
		postalCode: "",
		city: "",
		firstName: "",
		lastName: "",
		street: "",
		streetNo: "",
		email: "",
		agreedToPolicy: false,
		registered: false,
	});

	const [statisticsSummary, setStatisticsSummary] = useState<{
		general: { [key: string]: unknown },
		statistics: { [key: string]: unknown },
	}>();

	useEffect(() => {
		fetchRegistrationInfos().then(r => console.log(r));
		fetchStatisticSummary();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClickContinue = async () => {
		// if state is deleteSubmit then delete infos about adaptor else show next state
		if (state === "deleteSubmit") {
			await resetRegistrationData();
		} else {
			setState(states[state].nextState[1] as keyof typeof states);
		}
	};

	const fetchRegistrationInfos = async () => {
		const registrationInfo = await fetchAdopterRegistration();

		// merge response into initial values for formik
		setInitialValues({ ...initialValues, ...registrationInfo });
	};

	const fetchStatisticSummary = async () => {
		const info = await fetchAdopterStatisticsSummary();

		setStatisticsSummary(info);
	};

	const handleSubmit = (values: Registration) => {
		// post request for adopter information
		postRegistration(values)
			.then(() => {
				// show thank you state
				return setState(states[state].nextState[0] as keyof typeof states);
			})
			.catch(() => {
				// show error state
				return setState(states[state].nextState[1] as keyof typeof states);
			});
	};

	const resetRegistrationData = () => {
		// delete adopter information
		deleteAdopterRegistration()
			.then(() => {
				// show thank you state
				return setState(states[state].nextState[0] as keyof typeof states);
			})
			.catch(() => {
				// show error state
				return setState(states[state].nextState[1] as keyof typeof states);
			});
	};

	// style of label when input has content
	const styleWithContent = {
		fontSize: "70%",
		fontWeight: "700",
		transform: "translate3d(0, -35%, 0)",
		opacity: 1,
	};

	return (
	<>
		{/* shows information about the registration*/}
		{state === "information" && (
			<ModalContent modalContentClassName="modal-content active">
				<div
					className="registration-header"
					style={{ padding: "5px 0 15px 0" }}
				>
					<h2>
						{t("ADOPTER_REGISTRATION.MODAL.INFORMATION_STATE.HEADER")}
					</h2>
				</div>
				<div>
					<div className="row">
						<p>
							{t(
								"ADOPTER_REGISTRATION.MODAL.INFORMATION_STATE.INFORMATION_PARAGRAPH_1",
							)}
						</p>
						<br />
						<p>
							{t(
								"ADOPTER_REGISTRATION.MODAL.INFORMATION_STATE.INFORMATION_PARAGRAPH_2",
							)}
						</p>
					</div>
				</div>
			</ModalContent>
		)}

		{/* shows terms of use */}
		{state === "legalInfo" && (
			<ModalContent modalContentClassName="modal-content active">
				<div>
					<div className="row">
						<div className="scrollbox">
							<TermsOfUsePage />
						</div>
					</div>
				</div>
			</ModalContent>
		)}

		{/* shows state after skipping the registration */}
		{state === "skip" && (
			<ModalContent modalContentClassName="modal-content active">
				<div className="registration-header">
					<h2>{t("ADOPTER_REGISTRATION.MODAL.SKIP_STATE.HEADER")}</h2>
				</div>
				<div>
					<div className="row">
						<p>
							<span>
								{t("ADOPTER_REGISTRATION.MODAL.SKIP_STATE.TEXT")}
							</span>
							<br />
						</p>
					</div>
				</div>
			</ModalContent>
		)}

		{/* shows delete confirmation */}
		{state === "deleteSubmit" && (
			<ModalContent modalContentClassName="modal-content active">
				<p>
					<span>
						{t("ADOPTER_REGISTRATION.MODAL.DELETE_SUBMIT_STATE.TEXT")}
					</span>
				</p>
			</ModalContent>
		)}

		{/* shows spinner while API requests are processed */}
		{(state === "save" || state === "delete" || state === "update") && (
			<ModalContent modalContentClassName="modal-content active">
				<div>
					<div className="row spinner-container">
						<i className="fa fa-spinner fa-spin fa-4x fa-fw" />
					</div>
				</div>
			</ModalContent>
		)}

		{/* shows thank you after registration */}
		{state === "thankYou" && (
			<ModalContent modalContentClassName="modal-content active">
				<div className="registration-header">
					<h2>
						{t("ADOPTER_REGISTRATION.MODAL.THANK_YOU_STATE.HEADER")}
					</h2>
				</div>
				<div>
					<div>
						<p>
							<span>
								{t(
									"ADOPTER_REGISTRATION.MODAL.THANK_YOU_STATE.TEXT_LEADING_TO_PATH",
								)}
							</span>
							<b>
								(<span>{t("HELP.HELP")}</span>)
								{" "}
								<span className="fa fa-question-circle" />
								{" > "}
								<span>{t("HELP.ADOPTER_REGISTRATION")}</span>
							</b>
							<span>
								{" "}
								{t(
									"ADOPTER_REGISTRATION.MODAL.THANK_YOU_STATE.TEXT_LEADING_AFTER_PATH",
								)}
							</span>
						</p>
					</div>
				</div>
			</ModalContent>
		)}

		{/* shows error */}
		{state === "error" && (
			<ModalContent modalContentClassName="modal-content active">
				<div className="registration-header">
					<h2>{t("ADOPTER_REGISTRATION.MODAL.ERROR.HEADER")}</h2>
				</div>
				<div>
					<div className="row">
						<p>
							<span>{t("ADOPTER_REGISTRATION.MODAL.ERROR.TEXT")}</span>
						</p>
					</div>
				</div>
			</ModalContent>
		)}

		{/* shows registration form containing adaptor information */}
		<Formik
			initialValues={initialValues}
			enableReinitialize
			validationSchema={AdopterRegistrationSchema}
			onSubmit={values => handleSubmit(values)}
		>
			{formik => (
				<>
					{state === "form" && (
						<ModalContent modalContentClassName="modal-content active">
							<div>
								<fieldset>
									<legend>
										{t(
											"ADOPTER_REGISTRATION.MODAL.FORM_STATE.ORGANISATION",
										)}
									</legend>
									<div className="row">
										<div className="col">
											<div className="form-group">
												<Field
													type="text"
													name="organisationName"
													id="adopter_organisation"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_organisation"
													style={
														formik.values.organisationName
															? styleWithContent
															: {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.ORGANISATION",
													)}
												</label>
											</div>
										</div>
										<div className="col">
											<div className="form-group">
												<Field
													type="text"
													name="departmentName"
													id="adopter_department"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_department"
													style={
														formik.values.departmentName
															? styleWithContent
															: {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.DEPARTMENT",
													)}
												</label>
											</div>
										</div>
									</div>
									<div className="row">
										<div className="col">
											<div className="form-group">
												<Field
													type="text"
													name="street"
													id="adopter_street"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_street"
													style={
														formik.values.street ? styleWithContent : {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.STREET",
													)}
												</label>
											</div>
										</div>
										<div className="col">
											<div className="form-group">
												<Field
													type="text"
													name="streetNo"
													id="adopter_streetnumber"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_streetnumber"
													style={
														formik.values.streetNo ? styleWithContent : {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.NUMBER",
													)}
												</label>
											</div>
										</div>
									</div>
									<div className="row">
										<div className="col">
											<div className="form-group">
												<Field
													style={{ color: "#666", fontWeight: "600" }}
													id="adopter_country"
													name="country"
													as="select"
													className="form-control"
												>
													<option value="" />
													{countries.map((country, key) => (
														<option key={key} value={country.code}>
															{country.name}
														</option>
													))}
												</Field>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_country"
													style={
														formik.values.country ? styleWithContent : {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.COUNTRY",
													)}
												</label>
											</div>
										</div>
										<div className="col">
											<div className="form-group-pair">
												<div className="form-group">
													<Field
														type="text"
														name="postalCode"
														id="adopter_postalcode"
														className="form-control"
													/>
													<label
														className="form-control-placeholder"
														htmlFor="adopter_postalcode"
														style={
															formik.values.postalCode
																? styleWithContent
																: {}
														}
													>
														{t(
															"ADOPTER_REGISTRATION.MODAL.FORM_STATE.POSTAL_CODE",
														)}
													</label>
												</div>
												<div className="form-group">
													<Field
														type="text"
														name="city"
														id="adopter_city"
														className="form-control"
													/>
													<label
														className="form-control-placeholder"
														htmlFor="adopter_city"
														style={
															formik.values.city ? styleWithContent : {}
														}
													>
														{t(
															"ADOPTER_REGISTRATION.MODAL.FORM_STATE.CITY",
														)}
													</label>
												</div>
											</div>
										</div>
									</div>
								</fieldset>
								<fieldset>
									<legend>
										{t(
											"ADOPTER_REGISTRATION.MODAL.FORM_STATE.CONTACT_INFO",
										)}
									</legend>
									<div className="row">
										<div className="col">
											<div className="form-group">
												<Field
													type="text"
													name="firstName"
													id="adopter_firstname"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_firstname"
													style={
														formik.values.firstName
															? styleWithContent
															: {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.FIRST_NAME",
													)}
												</label>
											</div>
										</div>
										<div className="col">
											<div className="form-group">
												<Field
													type="text"
													name="lastName"
													id="adopter_lastname"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_lastname"
													style={
														formik.values.lastName ? styleWithContent : {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.LAST_NAME",
													)}
												</label>
											</div>
										</div>
									</div>
									<div className="row">
										<div className="col">
											<div className="form-group">
												<Field
													id="adopter_emailadr"
													name="email"
													type="email"
													className="form-control"
												/>
												<label
													className="form-control-placeholder"
													htmlFor="adopter_emailadr"
													style={
														formik.values.email ? styleWithContent : {}
													}
												>
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.MAIL",
													)}
												</label>
											</div>
										</div>
										<div className="col">
											<div className="form-group form-group-checkbox">
												<Field
													type="checkbox"
													name="contactMe"
													id="adopter_contactme"
													className="form-control"
												/>
												<label htmlFor="adopter_contactme">
													{t(
														"ADOPTER_REGISTRATION.MODAL.FORM_STATE.CONTACT_ME",
													)}
												</label>
											</div>
										</div>
									</div>
								</fieldset>
								<fieldset>
									<legend>
										{t(
											"ADOPTER_REGISTRATION.MODAL.FORM_STATE.SYSTEM_TYPE_HEADLINE",
										)}
									</legend>
									<div className="row">
										<div className="form-group">
											<Field
												style={{ color: "#666", fontWeight: "600" }}
												id="system_type"
												name="systemType"
												as="select"
												className="form-control"
											>
												<option value=""/>
												{systemTypes.map((systemType, key) => (
													<option key={key} value={systemType.value}>
														{t(systemType.name)}
													</option>
												))}
											</Field>
											<label
												className="form-control-placeholder"
												htmlFor="system_type"
												style={
													formik.values.systemType ? styleWithContent : {}
												}
											>
												{t(
													"ADOPTER_REGISTRATION.MODAL.FORM_STATE.SYSTEM_TYPE",
												)}
											</label>
										</div>
									</div>
								</fieldset>
								<fieldset>
									<legend>
										{t(
											"ADOPTER_REGISTRATION.MODAL.FORM_STATE.WHICH_DATA_TO_SHARE",
										)}
									</legend>
									<div className="form-group form-group-checkbox">
										<Field
											type="checkbox"
											name="allowsStatistics"
											id="adopter_allows_statistics"
											className="form-control"
										/>
										<label htmlFor="adopter_allows_statistics">
											{t(
													"ADOPTER_REGISTRATION.MODAL.FORM_STATE.USAGE_STATISTICS",
											)}
										</label>
								</div>
									<div className="form-group form-group-checkbox">
										<Field
											type="checkbox"
											name="allowsErrorReports"
											id="adopter_allows_err_reports"
											className="form-control"
										/>
										<label htmlFor="adopter_allows_err_reports">
											{t(
												"ADOPTER_REGISTRATION.MODAL.FORM_STATE.ERROR_REPORTS",
											)}
										</label>
									</div>
								</fieldset>
								<fieldset>
									<legend>
										{t(
											"ADOPTER_REGISTRATION.MODAL.FORM_STATE.POLICY_HEADLINE",
										)}
									</legend>
									<div className="form-group form-group-checkbox">
										<Field
											type="checkbox"
											name="agreedToPolicy"
											id="agreedToPolicy"
											className="form-control"
										/>
										<label htmlFor="agreedToPolicy">
											<span>
												{t(
													"ADOPTER_REGISTRATION.MODAL.FORM_STATE.READ_TERMS_OF_USE_BEFORE",
												)}
											</span>
											<span
												className="link"
												onClick={() =>
													setState(states[state].nextState[2] as keyof typeof states)
												}
											>
												{" " + t(
													"ADOPTER_REGISTRATION.MODAL.FORM_STATE.READ_TERMS_OF_USE_LINK",
												) + " "}
											</span>
											<span>
												{t(
													"ADOPTER_REGISTRATION.MODAL.FORM_STATE.READ_TERMS_OF_USE_AFTER",
												)}
											</span>
										</label>
									</div>
								</fieldset>
							</div>
						</ModalContent>
					)}

					{/* shows summary of information */}
					{state === "summary" && (
						<ModalContent modalContentClassName="modal-content active">
							<p>{t("ADOPTER_REGISTRATION.MODAL.SUMMARY_STATE.HEADER")}</p>
							<p>{t("ADOPTER_REGISTRATION.MODAL.SUMMARY_STATE.GENERAL_HEADER")}</p>
							<div className="scrollbox">
								<pre>
									{JSON.stringify(formik.values, null, "\t")}
								</pre>
							</div>
							<br />

							{formik.values.allowsStatistics ?
							<>
								<p>{t("ADOPTER_REGISTRATION.MODAL.SUMMARY_STATE.STATS_HEADER")}</p>
								<div className="scrollbox">
									<pre>
										{JSON.stringify(statisticsSummary?.statistics, null, "\t")}
									</pre>
								</div>
							</>
							: <p>{t("ADOPTER_REGISTRATION.MODAL.SUMMARY_STATE.NO_STATS_HEADER")}</p>
							}
						</ModalContent>
					)}

					{/* navigation buttons depending on state of modal */}
					<footer>
						{states[state].buttons.submit && (
							<div className="pull-right">
								{/* submit of form content */}
								{state === "summary" ?
										<button
										onClick={() => formik.handleSubmit()}
										className={cn("submit")}
									>
										{t(states[state].buttons.submitButtonText as ParseKeys)}
									</button>
								: state === "form" ?
									<button
										disabled={
											!(formik.isValid && formik.values.agreedToPolicy)
										}
										aria-disabled={
											!(formik.isValid && formik.values.agreedToPolicy)
										}
										onClick={() => onClickContinue()}
										className={cn("submit", {
											active:
												formik.isValid && formik.values.agreedToPolicy,
											inactive: !(
												formik.isValid && formik.values.agreedToPolicy
											),
										})}
									>
										{t(states[state].buttons.submitButtonText as ParseKeys)}
									</button>
								:
									// continue button or confirm button (depending on state)
									<button
										className="continue-registration"
										onClick={() => onClickContinue()}
									>
										{t(states[state].buttons.submitButtonText as ParseKeys)}
									</button>
								}
							</div>
						)}

						{/* back, delete or cancel button depending on state */}
						<div className="pull-left">
							{states[state].buttons.back && (
								<button
									className="cancel"
// @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
									onClick={() => setState(states[state].nextState[5])}
								>
									{t("ADOPTER_REGISTRATION.MODAL.BACK")}
								</button>
							)}
							{state === "form" && formik.values.registered && (
								<button
									className="danger"
									onClick={() => setState(states[state].nextState[4] as keyof typeof states)}
								>
									{t("WIZARD.DELETE")}
								</button>
							)}
							{states[state].buttons.skip && (
								<button
									className="cancel"
// @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
									onClick={() => setState(states[state].nextState[2])}
								>
									{t("ADOPTER_REGISTRATION.MODAL.SKIP")}
								</button>
							)}
						</div>
					</footer>
				</>
			)}
		</Formik>
		</>
	);
};

export default RegistrationModal;
