import React, { useState } from "react";
import { connect } from "react-redux";
import { useTranslation } from "react-i18next";
import ConfirmModal from "../../shared/ConfirmModal";
import { deleteGroup } from "../../../thunks/groupThunks";
import GroupDetailsModal from "./modal/GroupDetailsModal";
import { getUserInformation } from "../../../selectors/userInfoSelectors";
import { hasAccess } from "../../../utils/utils";
import { useAppDispatch } from "../../../store";
import { fetchGroupDetails } from "../../../slices/groupDetailsSlice";

/**
 * This component renders the action cells of groups in the table view
 */
const GroupsActionsCell = ({
    row,
    deleteGroup,
    user
}: any) => {
	const { t } = useTranslation();
	const dispatch = useAppDispatch();

	const [displayDeleteConfirmation, setDeleteConfirmation] = useState(false);
	const [displayGroupDetails, setGroupDetails] = useState(false);

	const hideDeleteConfirmation = () => {
		setDeleteConfirmation(false);
	};

// @ts-expect-error TS(7006): Parameter 'id' implicitly has an 'any' type.
	const deletingGroup = (id) => {
		deleteGroup(id);
	};

	const hideGroupDetails = () => {
		setGroupDetails(false);
	};

	const showGroupDetails = async () => {
		await dispatch(fetchGroupDetails(row.id));

		setGroupDetails(true);
	};

	return (
		<>
			{/*edit/show group */}
			{hasAccess("ROLE_UI_GROUPS_EDIT", user) && (
				<button
					onClick={() => showGroupDetails()}
					className="button-like-anchor more"
// @ts-expect-error TS(2322): Type 'DefaultTFuncReturn' is not assignable to typ... Remove this comment to see the full error message
					title={t("USERS.GROUPS.TABLE.TOOLTIP.DETAILS")}
				/>
			)}

			{/*modal displaying details about group*/}
			{displayGroupDetails && (
				<GroupDetailsModal close={hideGroupDetails} groupName={row.name} />
			)}

			{/* delete group */}
			{hasAccess("ROLE_UI_GROUPS_DELETE", user) && (
				<button
					onClick={() => setDeleteConfirmation(true)}
					className="button-like-anchor remove"
// @ts-expect-error TS(2322): Type 'DefaultTFuncReturn' is not assignable to typ... Remove this comment to see the full error message
					title={t("USERS.GROUPS.TABLE.TOOLTIP.DETAILS")}
				/>
			)}

			{/*Confirmation for deleting a group*/}
			{displayDeleteConfirmation && (
				<ConfirmModal
					close={hideDeleteConfirmation}
					resourceId={row.id}
					resourceName={row.name}
					deleteMethod={deletingGroup}
					resourceType="GROUP"
				/>
			)}
		</>
	);
};

// Getting state data out of redux store
// @ts-expect-error TS(7006): Parameter 'state' implicitly has an 'any' type.
const mapStateToProps = (state) => ({
	user: getUserInformation(state),
});

// @ts-expect-error TS(7006): Parameter 'dispatch' implicitly has an 'any' type.
const mapDispatchToProps = (dispatch) => ({
// @ts-expect-error TS(7006): Parameter 'id' implicitly has an 'any' type.
	deleteGroup: (id) => dispatch(deleteGroup(id)),
});

export default connect(mapStateToProps, mapDispatchToProps)(GroupsActionsCell);
