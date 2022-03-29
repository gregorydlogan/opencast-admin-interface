import React from "react";
import {Formik} from "formik";
import {connect} from "react-redux";
import {initialFormValuesNewGroup} from "../../../../configs/modalConfig";
import WizardStepper from "../../../shared/wizard/WizardStepper";
import GroupMetadataPage from "./GroupMetadataPage";
import GroupRolesPage from "./GroupRolesPage";
import GroupUsersPage from "./GroupUsersPage";
import NewGroupSummaryPage from "./NewGroupSummaryPage";
import {postNewGroup} from "../../../../thunks/groupThunks";
import {usePageFunctions} from "../../../../hooks/wizardHooks";
import {NewGroupSchema} from "../../../../utils/validate";
import {logger} from "../../../../utils/logger";

/**
 * This component renders the new group wizard
 */
const NewGroupWizard = ({ close, postNewGroup }) => {

    const [snapshot, page, nextPage, previousPage] = usePageFunctions(0, initialFormValuesNewGroup);

    // Caption of steps used by Stepper
    const steps = [
        {
            translation: 'USERS.GROUPS.DETAILS.TABS.METADATA',
            name: 'metadata'
        }, {
            translation: 'USERS.GROUPS.DETAILS.TABS.ROLES',
            name: 'roles'
        }, {
            translation: 'USERS.GROUPS.DETAILS.TABS.USERS',
            name: 'users'
        }, {
            translation: 'USERS.GROUPS.DETAILS.TABS.SUMMARY',
            name: 'summary'
        }
    ];

    // Validation schema of current page
    const currentValidationSchema = NewGroupSchema[page];

    const handleSubmit = values => {
        const response = postNewGroup(values);
        logger.info(response);
        close();
    }

    return (
        <>
            {/* Stepper that shows each step of wizard as header */}
            <WizardStepper steps={steps} page={page}/>

            {/* Initialize overall form */}
            <Formik initialValues={snapshot}
                    validationSchema={currentValidationSchema}
                    onSubmit={values => handleSubmit(values)}>
                {/* Render wizard pages depending on current value of page variable */}
                {formik => (
                    <div>
                        {page === 0 && (
                            <GroupMetadataPage formik={formik}
                                               nextPage={nextPage}/>
                        )}
                        {page === 1 && (
                            <GroupRolesPage formik={formik}
                                            nextPage={nextPage}
                                            previousPage={previousPage}/>
                        )}
                        {page === 2 && (
                            <GroupUsersPage formik={formik}
                                            nextPage={nextPage}
                                            previousPage={previousPage}/>
                        )}
                        {page === 3 && (
                            <NewGroupSummaryPage formik={formik}
                                                 previousPage={previousPage}/>
                        )}
                    </div>
                )}
            </Formik>
        </>
    )
};

const mapDispatchToProps = dispatch => ({
    postNewGroup: values => dispatch(postNewGroup(values))
});

export default connect(null, mapDispatchToProps)(NewGroupWizard);
