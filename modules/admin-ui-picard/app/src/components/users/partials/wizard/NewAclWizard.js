import React from "react";
import {connect} from "react-redux";
import {Formik} from "formik";
import WizardStepper from "../../../shared/wizard/WizardStepper";
import AclMetadataPage from "./AclMetadataPage";
import NewAclSummaryPage from "./NewAclSummaryPage";
import {postNewAcl} from "../../../../thunks/aclThunks";
import {initialFormValuesNewAcl} from "../../../../configs/modalConfig";
import {usePageFunctions} from "../../../../hooks/wizardHooks";
import {NewAclSchema} from "../../../../utils/validate";
import {logger} from "../../../../utils/logger";
import AclAccessPage from "./AclAccessPage";


/**
 * This component manages the pages of the new ACL wizard
 */
const NewAclWizard = ({ close, postNewAcl }) => {
    const [snapshot, page, nextPage, previousPage] = usePageFunctions(0, initialFormValuesNewAcl);

    const steps = [
        {
            name: 'metadata',
            translation: 'USERS.ACLS.NEW.TABS.METADATA'
        },
        {
            name: 'access',
            translation: 'USERS.ACLS.NEW.TABS.ACCESS'
        },
        {
            name: 'summary',
            translation: 'USERS.ACLS.NEW.TABS.SUMMARY'
        }
    ];

    const currentValidationSchema = NewAclSchema[page];


    const handleSubmit = values => {
        const response = postNewAcl(values);
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
                            <AclMetadataPage formik={formik}
                                             nextPage={nextPage}/>
                        )}
                        {page === 1 && (
                            <AclAccessPage formik={formik}
                                              nextPage={nextPage}
                                              previousPage={previousPage}/>
                        )}
                        {page === 2 && (
                            <NewAclSummaryPage formik={formik}
                                               previousPage={previousPage}/>
                        )}
                    </div>
                )}
            </Formik>
        </>
    );
};

const mapDispatchToProps = dispatch => ({
    postNewAcl: values => dispatch(postNewAcl(values))
});


export default connect(null, mapDispatchToProps)(NewAclWizard);
