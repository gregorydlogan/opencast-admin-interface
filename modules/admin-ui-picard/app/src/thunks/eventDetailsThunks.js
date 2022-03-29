import axios from "axios";
import {
    checkConflictsFailure,
    checkConflictsInProgress,
    checkConflictsSuccess,
    deleteEventWorkflowFailure,
    deleteEventWorkflowInProgress,
    deleteEventWorkflowSuccess,
    doEventWorkflowActionFailure,
    doEventWorkflowActionInProgress,
    doEventWorkflowActionSuccess,
    loadEventAssetAttachmentDetailsFailure,
    loadEventAssetAttachmentDetailsSuccess,
    loadEventAssetAttachmentsFailure,
    loadEventAssetAttachmentsSuccess,
    loadEventAssetCatalogDetailsFailure,
    loadEventAssetCatalogDetailsSuccess,
    loadEventAssetCatalogsFailure,
    loadEventAssetCatalogsSuccess,
    loadEventAssetMediaDetailsFailure,
    loadEventAssetMediaDetailsSuccess,
    loadEventAssetMediaFailure,
    loadEventAssetMediaSuccess,
    loadEventAssetPublicationDetailsFailure,
    loadEventAssetPublicationDetailsSuccess,
    loadEventAssetPublicationsFailure,
    loadEventAssetPublicationsSuccess,
    loadEventAssetsFailure,
    loadEventAssetsInProgress,
    loadEventAssetsSuccess,
    loadEventCommentsFailure,
    loadEventCommentsInProgress,
    loadEventCommentsSuccess,
    loadEventMetadataFailure,
    loadEventMetadataInProgress,
    loadEventMetadataSuccess,
    loadEventPoliciesFailure,
    loadEventPoliciesInProgress,
    loadEventPoliciesSuccess,
    loadEventPublicationsFailure,
    loadEventPublicationsInProgress,
    loadEventPublicationsSuccess,
    loadEventSchedulingFailure,
    loadEventSchedulingInProgress,
    loadEventSchedulingSuccess,
    loadEventWorkflowDetailsFailure,
    loadEventWorkflowDetailsInProgress,
    loadEventWorkflowDetailsSuccess,
    loadEventWorkflowErrorDetailsFailure,
    loadEventWorkflowErrorDetailsInProgress,
    loadEventWorkflowErrorDetailsSuccess,
    loadEventWorkflowErrorsFailure,
    loadEventWorkflowErrorsInProgress,
    loadEventWorkflowErrorsSuccess,
    loadEventWorkflowOperationDetailsFailure,
    loadEventWorkflowOperationDetailsInProgress,
    loadEventWorkflowOperationDetailsSuccess,
    loadEventWorkflowOperationsFailure,
    loadEventWorkflowOperationsInProgress,
    loadEventWorkflowOperationsSuccess,
    loadEventWorkflowsFailure,
    loadEventWorkflowsInProgress,
    loadEventWorkflowsSuccess,
    saveCommentDone,
    saveCommentInProgress,
    saveCommentReplyDone,
    saveCommentReplyInProgress,
    saveEventSchedulingFailure,
    saveEventSchedulingInProgress,
    saveEventSchedulingSuccess,
    setEventMetadata,
    setEventWorkflow,
    setEventWorkflowConfiguration,
    setEventWorkflowDefinitions,
    setExtendedEventMetadata,
} from '../actions/eventDetailsActions';
import {addNotification} from "./notificationThunks";
import {
    createPolicy,
    getHttpHeaders,
    transformMetadataCollection,
    transformMetadataForUpdate
} from "../utils/resourceUtils";
import {NOTIFICATION_CONTEXT} from "../configs/modalConfig";
import {
    getBaseWorkflow,
    getCaptureAgents,
    getExtendedMetadata,
    getMetadata,
    getSchedulingSource,
    getWorkflow,
    getWorkflowDefinitions,
    getWorkflows
} from "../selectors/eventDetailsSelectors";
import {fetchWorkflowDef} from "./workflowThunks";
import {getWorkflowDef} from "../selectors/workflowSelectors";
import {logger} from "../utils/logger";
import {removeNotificationWizardForm} from "../actions/notificationActions";
import {calculateDuration} from "../utils/dateUtils";


// thunks for metadata

export const fetchMetadata = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventMetadataInProgress());

        const metadataRequest = await axios.get(`/admin-ng/event/${eventId}/metadata.json`);
        const metadataResponse = await metadataRequest.data;

        const mainCatalog = 'dublincore/episode';
        let usualMetadata = {};
        let extendedMetadata = [];

        for(const catalog of metadataResponse) {
            let transformedCatalog = {...catalog};

            if(catalog.locked !== undefined){
                let fields = [];

                for(const field in catalog.fields) {
                    fields.push({
                        ...field,
                        locked: catalog.locked,
                        readOnly: true
                    })
                }
                transformedCatalog = {
                    ...catalog,
                    fields: fields
                }
            }
            if(catalog.flavor === mainCatalog){
                usualMetadata = transformMetadataCollection({...transformedCatalog});
            } else {
                extendedMetadata.push(transformMetadataCollection({...transformedCatalog}));
            }
        }

        dispatch(loadEventMetadataSuccess(usualMetadata, extendedMetadata));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventMetadataFailure());
    }
}

export const updateMetadata = (eventId, values) => async (dispatch, getState) => {
    try {
        let metadataInfos = getMetadata(getState());

        const {fields, data, headers} = transformMetadataForUpdate(metadataInfos, values);

        await axios.put(`/admin-ng/event/${eventId}/metadata`, data, headers);

        // updated metadata in event details redux store
        let eventMetadata = {
            flavor: metadataInfos.flavor,
            title: metadataInfos.title,
            fields: fields
        };
        dispatch(setEventMetadata(eventMetadata));
    } catch (e) {
        logger.error(e);
    }
}

export const updateExtendedMetadata = (eventId, values, catalog) => async (dispatch, getState) => {
    try {
        const {fields, data, headers} = transformMetadataForUpdate(catalog, values);

        await axios.put(`/admin-ng/event/${eventId}/metadata`, data, headers);

        // updated extended metadata in event details redux store
        let eventMetadata = {
            ...catalog,
            fields: fields
        };


        const oldExtendedMetadata = getExtendedMetadata(getState());
        let newExtendedMetadata = [];

        for(const catalog of oldExtendedMetadata){
            if((catalog.flavor === eventMetadata.flavor) && (catalog.title === eventMetadata.title)){
                newExtendedMetadata.push(eventMetadata);
            } else {
                newExtendedMetadata.push(catalog);
            }
        }

        dispatch(setExtendedEventMetadata(newExtendedMetadata));
    } catch (e) {
        logger.error(e);
    }
}


//thunks for assets

export const fetchAssets = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        const assetsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/assets.json`);
        const assets = await assetsRequest.data;

        let transactionsReadOnly = true;
        const fetchTransactionResult = await dispatch(fetchHasActiveTransactions(eventId));
        if(fetchTransactionResult.active !== undefined){
            transactionsReadOnly = fetchTransactionResult.active
        }

        const resourceOptionsListRequest = await axios.get(`/admin-ng/resources/eventUploadAssetOptions.json`);
        const resourceOptionsListResponse = await resourceOptionsListRequest.data;

        let uploadAssetOptions = [];
        const optionsData = formatUploadAssetOptions(resourceOptionsListResponse);

        for(const option of optionsData.options){
            if (option.type !== 'track') {
                uploadAssetOptions.push({...option});
            }
        }

        // if no asset options, undefine the option variable
        uploadAssetOptions = uploadAssetOptions.length > 0 ? uploadAssetOptions : undefined;

        dispatch(loadEventAssetsSuccess(assets, transactionsReadOnly, uploadAssetOptions));
        if(transactionsReadOnly) {
            dispatch(addNotification('warning', 'ACTIVE_TRANSACTION', -1, null, NOTIFICATION_CONTEXT));
        }
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetsFailure());
    }
}

const formatUploadAssetOptions = (optionsData) => {
    const optionPrefixSource = 'EVENTS.EVENTS.NEW.SOURCE.UPLOAD';
    const optionPrefixAsset = 'EVENTS.EVENTS.NEW.UPLOAD_ASSET.OPTION';
    const workflowPrefix = 'EVENTS.EVENTS.NEW.UPLOAD_ASSET.WORKFLOWDEFID';

    let optionsResult = {};
    let uploadOptions = [];

    for(const [key, value] of Object.entries(optionsData)){
        if (key.charAt(0) !== '$') {
            if ((key.indexOf(optionPrefixAsset) >= 0) || (key.indexOf(optionPrefixSource) >= 0)) {
                // parse upload asset options
                let options = JSON.parse(value);
                if (!options['title']) {
                  options['title'] = key;
                }
                uploadOptions.push({...options});
            } else if (key.indexOf(workflowPrefix) >= 0) {
                // parse upload workflow definition id
                optionsResult['workflow'] = value;
            }
        }
    }
    optionsResult['options'] = uploadOptions;

    return optionsResult;
}

export const fetchAssetAttachments = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'attachment');

        const attachmentsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/attachment/attachments.json`,
            {params});
        const attachmentsResponse = await attachmentsRequest.data;

        dispatch(loadEventAssetAttachmentsSuccess(attachmentsResponse));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetAttachmentsFailure());
    }
}

export const fetchAssetAttachmentDetails = (eventId, attachmentId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'attachment');

        const attachmentDetailsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/attachment/${attachmentId}.json`,
            {params});
        const attachmentDetailsResponse = await attachmentDetailsRequest.data;

        dispatch(loadEventAssetAttachmentDetailsSuccess(attachmentDetailsResponse));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetAttachmentDetailsFailure());
    }
}

export const fetchAssetCatalogs = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'catalog');

        const catalogsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/catalog/catalogs.json`,
            {params});
        const catalogsResponse = await catalogsRequest.data;

        dispatch(loadEventAssetCatalogsSuccess(catalogsResponse));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetCatalogsFailure());
    }
}

export const fetchAssetCatalogDetails = (eventId, catalogId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'catalog');

        const catalogDetailsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/catalog/${catalogId}.json`,
            {params});
        const catalogDetailsResponse = await catalogDetailsRequest.data;

        dispatch(loadEventAssetCatalogDetailsSuccess(catalogDetailsResponse));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetCatalogDetailsFailure());
    }
}

export const fetchAssetMedia = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'media');

        const mediaRequest = await axios.get(`/admin-ng/event/${eventId}/asset/media/media.json`,
            {params});
        const mediaResponse = await mediaRequest.data;

        let media = [];

        //for every media file item we define the filename
        for(let i = 0; i < mediaResponse.length; i++){
            let item = mediaResponse[i];
            const url = item.url;
            item.mediaFileName = url.substring(url.lastIndexOf('/') + 1).split('?')[0];
            media.push(item);
        }

        dispatch(loadEventAssetMediaSuccess(media));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetMediaFailure());
    }
}

export const fetchAssetMediaDetails = (eventId, mediaId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'media');

        const mediaDetailsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/media/${mediaId}.json`,
            {params});
        const mediaDetailsResponse = await mediaDetailsRequest.data;

        let mediaDetails;

        if (typeof mediaDetailsResponse === 'string') {
            mediaDetails = JSON.parse(mediaDetailsResponse);
        } else {
            mediaDetails = mediaDetailsResponse;
        }

        mediaDetails.video = { ...mediaDetails,
            video: {
                previews: [{uri: mediaDetails.url}]
            },
            url: mediaDetails.url.split('?')[0]
        };

        dispatch(loadEventAssetMediaDetailsSuccess(mediaDetails));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetMediaDetailsFailure());
    }
}

export const fetchAssetPublications = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'publication');

        const publicationsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/publication/publications.json`,
            {params});
        const publicationsResponse = await publicationsRequest.data;

        dispatch(loadEventAssetPublicationsSuccess(publicationsResponse));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetPublicationsFailure());
    }
}

export const fetchAssetPublicationDetails = (eventId, publicationId) => async (dispatch) => {
    try {
        dispatch(loadEventAssetsInProgress());

        let params = new URLSearchParams();
        params.append("id1", 'publication');

        const publicationDetailsRequest = await axios.get(`/admin-ng/event/${eventId}/asset/publication/${publicationId}.json`,
            {params});
        const publicationDetailsResponse = await publicationDetailsRequest.data;

        dispatch(loadEventAssetPublicationDetailsSuccess(publicationDetailsResponse));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventAssetPublicationDetailsFailure());
    }
}


// thunks for access policies

export const saveAccessPolicies = (eventId, policies) => async (dispatch) => {

    const headers = getHttpHeaders();

    let data = new URLSearchParams();
    data.append("acl", JSON.stringify(policies));
    data.append("override", true);

    return axios.post(`/admin-ng/event/${eventId}/access`, data.toString(), headers)
        .then(response => {
            logger.info(response);
            dispatch(addNotification('info', 'SAVED_ACL_RULES', -1, null, NOTIFICATION_CONTEXT));
            return true;
        })
        .catch(response => {
            logger.error(response);
            dispatch(addNotification('error', 'ACL_NOT_SAVED', -1, null, NOTIFICATION_CONTEXT));
            return false;
        });
}

export const fetchAccessPolicies = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventPoliciesInProgress());

        const policyData = await axios.get(`/admin-ng/event/${eventId}/access.json`);
        let accessPolicies = await policyData.data;

        let policies = [];
        if(!!accessPolicies.episode_access){
            const json = JSON.parse(accessPolicies.episode_access.acl).acl.ace;
            let newPolicies = {};
            let policyRoles = [];
            for(let i = 0; i < json.length; i++){
                const policy = json[i];
                if(!newPolicies[policy.role]){
                    newPolicies[policy.role] = createPolicy(policy.role);
                    policyRoles.push(policy.role);
                }
                if (policy.action === 'read' || policy.action === 'write') {
                    newPolicies[policy.role][policy.action] = policy.allow;
                } else if (policy.allow === true || policy.allow === 'true'){
                    newPolicies[policy.role].actions.push(policy.action);
                }
            }
            policies = policyRoles.map(role => newPolicies[role]);
        }

        dispatch(loadEventPoliciesSuccess(policies));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventPoliciesFailure());
    }
}

export const fetchHasActiveTransactions = (eventId) => async () => {
    try {
        const transactionsData = await axios.get(`/admin-ng/event/${eventId}/hasActiveTransaction`);
        return await transactionsData.data;
    } catch (e) {
        logger.error(e);
    }
}


// thunks for comments

export const fetchComments = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventCommentsInProgress());

        const commentsData = await axios.get(`/admin-ng/event/${eventId}/comments`);
        const comments = await commentsData.data;

        const commentReasonsData = await axios.get(`/admin-ng/resources/components.json`);
        const commentReasons = (await commentReasonsData.data).eventCommentReasons;

        dispatch(loadEventCommentsSuccess(comments, commentReasons));
    } catch (e) {
        dispatch(loadEventCommentsFailure());
        logger.error(e);
    }
}

export const saveComment = (eventId, commentText, commentReason) => async (dispatch) => {
    try {
        dispatch(saveCommentInProgress());

        let headers = getHttpHeaders();

        let data = new URLSearchParams();
        data.append("text", commentText);
        data.append("reason", commentReason);

        const commentSaved = await axios.post(`/admin-ng/event/${eventId}/comment`,
            data.toString(), headers );
        await commentSaved.data;

        dispatch(saveCommentDone());
        return true;
    } catch (e) {
        dispatch(saveCommentDone());
        logger.error(e);
        return false;
    }
}

export const deleteComment = (eventId, commentId) => async () => {
    try {
        const commentDeleted = await axios.delete(`/admin-ng/event/${eventId}/comment/${commentId}`);
        await commentDeleted.data;
        return true;
    } catch (e) {
        logger.error(e);
        return false;
    }
}

export const saveCommentReply = (eventId, commentId, replyText, commentResolved) => async (dispatch) => {
    try {
        dispatch(saveCommentReplyInProgress());

        let headers = getHttpHeaders();

        let data = new URLSearchParams();
        data.append("text", replyText);
        data.append("resolved", commentResolved);

        const commentReply = await axios.post(`/admin-ng/event/${eventId}/comment/${commentId}/reply`,
            data.toString(), headers );

        await commentReply.data;

        dispatch(saveCommentReplyDone());
        return true;
    } catch (e) {
        dispatch(saveCommentReplyDone());
        logger.error(e);
        return false;
    }
}

export const deleteCommentReply = (eventId, commentId, replyId) => async () => {
    try {
        const commentReplyDeleted = await axios.delete(`/admin-ng/event/${eventId}/comment/${commentId}/${replyId}`);
        await commentReplyDeleted.data;

        return true;
    } catch (e) {
        logger.error(e);
        return false;
    }
}


// thunks for scheduling

export const fetchSchedulingInfo = (eventId) => async (dispatch) => {
    try {
        dispatch(loadEventSchedulingInProgress())

        // get data from API about event scheduling
        const schedulingRequest = await axios.get(`/admin-ng/event/${eventId}/scheduling.json`);
        const schedulingResponse = await schedulingRequest.data;

        // get data from API about capture agents
        const captureAgentsRequest = await axios.get(`/admin-ng/capture-agents/agents.json`);
        const captureAgentsResponse = await captureAgentsRequest.data;

        const startDate = new Date(schedulingResponse.start);
        const endDate = new Date(schedulingResponse.end);
        const {durationHours, durationMinutes} = calculateDuration(startDate, endDate);

        let captureAgents = [];
        let device = {
            id: '',
            name: '',
            inputs: []
        };

        for(const agent of captureAgentsResponse.results){
            const transformedAgent = {
                id: agent.Name,
                name: agent.Name,
                status: agent.Status,
                updated: agent.Update,
                inputs: agent.inputs,
                roomId: agent.roomId,
                type: "LOCATION",
                removable: ('AGENTS.STATUS.OFFLINE' === agent.Status || 'AGENTS.STATUS.UNKNOWN' === agent.Status)
            };

            captureAgents.push(transformedAgent);

            if(transformedAgent.id === schedulingResponse.agentId){
                let inputMethods = [];

                if (schedulingResponse.agentConfiguration['capture.device.names'] !== undefined) {
                    const inputs = schedulingResponse.agentConfiguration['capture.device.names'].split(',');
                    for(const input of inputs) {
                        inputMethods.push(input);
                    }
                }
                device = {
                    ...transformedAgent,
                    inputMethods: inputMethods
                };
            }
        }

        const source = {
            ...schedulingResponse,
            start: {
                date: startDate,
                hour: startDate.getHours(),
                minute: startDate.getMinutes()
            },
            end: {
                date: endDate,
                hour: endDate.getHours(),
                minute: endDate.getMinutes()
            },
            duration: {
                hour: durationHours,
                minute: durationMinutes
            },
            presenters: schedulingResponse.presenters.join(", "),
            device: {...device}
        }

        dispatch(loadEventSchedulingSuccess(source, captureAgents));
    } catch (e) {
        logger.error(e);
        dispatch(loadEventSchedulingFailure());
    }
}

export const checkConflicts = (eventId, startDate, endDate, deviceId) => async (dispatch) => {
    dispatch(checkConflictsInProgress());

    const conflicts = [];

    const now = new Date();
    if(endDate < now){
        dispatch(removeNotificationWizardForm());
        dispatch(addNotification('error', 'CONFLICT_IN_THE_PAST', -1, null, NOTIFICATION_CONTEXT));
        dispatch(checkConflictsSuccess(conflicts));
        return false;
    } else {
        dispatch(removeNotificationWizardForm());
        let headers = getHttpHeaders();

        const conflictTimeFrame = {
            id: eventId,
            start: startDate.toISOString(),
            duration: endDate - startDate,
            device: deviceId,
            end: endDate.toISOString()
        };

        let data = new URLSearchParams();
        data.append("metadata", JSON.stringify(conflictTimeFrame));

        await axios.post(`/admin-ng/event/new/conflicts`, data, headers )
            .then(response => {
                logger.info(response);
                const responseStatus = response.status;
                if(responseStatus === 409){
                    //conflict detected, add notification and get conflict specifics
                    dispatch(addNotification('error', 'CONFLICT_DETECTED', -1, null, NOTIFICATION_CONTEXT));
                    const conflictsResponse =  response.data;

                    for(const conflict of conflictsResponse){
                        conflicts.push({
                            title: conflict.title,
                            start: conflict.start,
                            end: conflict.end
                        });
                    }
                } else if(204){
                    //no conflicts detected
                }

                dispatch(checkConflictsSuccess(conflicts));
            })
            .catch(response => {
                logger.error(response);
                dispatch(checkConflictsFailure());
            });

        return true;
    }
}

export const saveSchedulingInfo = (eventId, values, startDate, endDate) => async (dispatch, getState) => {
    dispatch(saveEventSchedulingInProgress());

    const state = getState();
    const oldSource = getSchedulingSource(state);
    const captureAgents = getCaptureAgents(state);
    let device = {};

    for(const agent of captureAgents){
        if(agent.id === values.captureAgent){
            device = {
                ...agent,
                inputMethods: values.inputs
            };
        }
    }

    const source = {
        ...oldSource,
        agentId: device.id,
        start: {
            date: startDate,
            hour: parseInt(values.scheduleStartHour),
            minute: parseInt(values.scheduleStartMinute)
        },
        end: {
            date: endDate,
            hour: parseInt(values.scheduleEndHour),
            minute: parseInt(values.scheduleEndMinute)
        },
        duration: {
            hour: parseInt(values.scheduleDurationHours),
            minute: parseInt(values.scheduleDurationMinutes)
        },
        device: {...device},
        agentConfiguration: {
            ...oldSource.agentConfiguration,
            'capture.device.names': values.inputs.join(','),
            'event.location': device.id
        }
    }

    const start = startDate.toISOString();
    const end = endDate.toISOString();

    const headers = getHttpHeaders();
    let data = new URLSearchParams();
    data.append(
        "scheduling", JSON.stringify({
            agentId: source.agentId,
            start: start,
            end: end,
            agentConfiguration: source.agentConfiguration
        })
    );

    // save new scheduling information
    await axios.put(`/admin-ng/event/${eventId}/scheduling`, data, headers)
        .then( () => {
            dispatch(removeNotificationWizardForm());
            dispatch(saveEventSchedulingSuccess(source));
            dispatch(fetchSchedulingInfo(eventId));

        })
        .catch( response => {
            logger.error(response);
            dispatch(addNotification('error', 'EVENTS_NOT_UPDATED', -1, null, NOTIFICATION_CONTEXT));
            dispatch(saveEventSchedulingFailure());
        });
}


// thunks for workflows

export const fetchWorkflows = (eventId) => async (dispatch, getState) => {
    try {
        dispatch(loadEventWorkflowsInProgress());

        // todo: show notification if there are active transactions
        // dispatch(addNotification('warning', 'ACTIVE_TRANSACTION', -1, null, NOTIFICATION_CONTEXT));

        const data = await axios.get(`/admin-ng/event/${eventId}/workflows.json`);
        const workflowsData = await data.data;

        if(!!workflowsData.results){
            const workflows = {
                entries: workflowsData.results,
                scheduling: false,
                workflow: {
                    id: "",
                    description: ""
                }
            };

            dispatch(loadEventWorkflowsSuccess(workflows));
        } else {
            const workflows = {
                workflow: workflowsData,
                scheduling: true,
                entries: []
            };

            await dispatch(fetchWorkflowDef('event-details'));

            const state = getState();

            const workflowDefinitions = getWorkflowDef(state);

            dispatch(setEventWorkflowDefinitions(workflows, workflowDefinitions));
            dispatch(changeWorkflow(false));

            dispatch(loadEventWorkflowsSuccess(workflows));
        }
    } catch (e) {
        dispatch(loadEventWorkflowsFailure());
        logger.error(e);
    }
}

export const fetchWorkflowDetails = (eventId, workflowId) => async (dispatch) => {

    try {
        dispatch(loadEventWorkflowDetailsInProgress());

        const data = await axios.get(`/admin-ng/event/${eventId}/workflows/${workflowId}.json`);
        const workflowData = await data.data;
        dispatch(loadEventWorkflowDetailsSuccess(workflowData));
    } catch (e) {
        dispatch(loadEventWorkflowDetailsFailure())
        // todo: probably needs a Notification to the user
        logger.error(e);
    }
}

const changeWorkflow = (saveWorkflow) => async (dispatch, getState) => {
    const state = getState();
    const workflow = getWorkflow(state);

    if(!!workflow.workflowId){
        dispatch(setEventWorkflowConfiguration(workflow));
    } else {
        dispatch(setEventWorkflowConfiguration(getBaseWorkflow(state)));
    }
    if(saveWorkflow){
        saveWorkflowConfig();
    }
}

export const updateWorkflow = (saveWorkflow, workflowId) => async (dispatch, getState) => {
    const state = getState();
    const workflowDefinitions = getWorkflowDefinitions(state);
    const workflowDef = workflowDefinitions.find(def => def.id === workflowId);
    await dispatch(setEventWorkflow({
        workflowId: workflowId,
        description: workflowDef.description,
        configuration: workflowDef.configuration
    }));
    dispatch(changeWorkflow(saveWorkflow));
}

const saveWorkflowConfig = () => {
    //todo
}

export const performWorkflowAction = (eventId, workflowId, action, close) => async (dispatch) => {
    dispatch(doEventWorkflowActionInProgress());

    let headers = {headers: {
        'Content-Type': 'application/json;charset=utf-8'
    }};

    let data = {
        "action": action,
        "id": eventId,
        "wfId": workflowId
    };

    axios.put(`/admin-ng/event/${eventId}/workflows/${workflowId}/action/${action}`, data, headers)
        .then( () => {
            dispatch(addNotification('success', 'EVENTS_PROCESSING_ACTION_' + action, -1, null, NOTIFICATION_CONTEXT));
            close();
            dispatch(doEventWorkflowActionSuccess());
        })
        .catch( () => {
            dispatch(addNotification('error', 'EVENTS_PROCESSING_ACTION_NOT_' + action, -1, null, NOTIFICATION_CONTEXT));
            dispatch(doEventWorkflowActionFailure());
        });
}

export const deleteWorkflow = (eventId, workflowId) => async (dispatch, getState) => {
    dispatch(deleteEventWorkflowInProgress());

    axios.delete(`/admin-ng/event/${eventId}/workflows/${workflowId}`)
        .then( () => {
            dispatch(addNotification('success', 'EVENTS_PROCESSING_DELETE_WORKFLOW', -1, null, NOTIFICATION_CONTEXT));

            const state = getState();
            const workflows = getWorkflows(state);

            if(!!workflows.entries){
                dispatch(deleteEventWorkflowSuccess(workflows.entries.filter( wf => wf.id !== workflowId)));
            } else {
                dispatch(deleteEventWorkflowSuccess(workflows.entries));
            }
        })
        .catch( () => {
            dispatch(addNotification('error', 'EVENTS_PROCESSING_DELETE_WORKFLOW_FAILED', -1, null, NOTIFICATION_CONTEXT));
            dispatch(deleteEventWorkflowFailure());
        });
}

export const fetchWorkflowOperations = (eventId, workflowId) => async (dispatch) => {
    try {
        dispatch(loadEventWorkflowOperationsInProgress());

        const data = await axios.get(`/admin-ng/event/${eventId}/workflows/${workflowId}/operations.json`);
        const workflowOperationsData = await data.data;
        const workflowOperations = {entries: workflowOperationsData}
        dispatch(loadEventWorkflowOperationsSuccess(workflowOperations));
    } catch (e) {
        dispatch(loadEventWorkflowOperationsFailure())
        // todo: probably needs a Notification to the user
        logger.error(e);
    }
}

export const fetchWorkflowOperationDetails = (eventId, workflowId, operationId) => async (dispatch) => {
    try {
        dispatch(loadEventWorkflowOperationDetailsInProgress());

        const data = await axios.get(`/admin-ng/event/${eventId}/workflows/${workflowId}/operations/${operationId}`);
        const workflowOperationDetails = await data.data;
        dispatch(loadEventWorkflowOperationDetailsSuccess(workflowOperationDetails));
    } catch (e) {
        dispatch(loadEventWorkflowOperationDetailsFailure())
        // todo: probably needs a Notification to the user
        logger.error(e);
    }
}

export const fetchWorkflowErrors = (eventId, workflowId) => async (dispatch) => {
    try {
        dispatch(loadEventWorkflowErrorsInProgress());

        const data = await axios.get(`/admin-ng/event/${eventId}/workflows/${workflowId}/errors.json`);
        const workflowErrorsData = await data.data;
        const workflowErrors = {entries: workflowErrorsData}
        dispatch(loadEventWorkflowErrorsSuccess(workflowErrors));
    } catch (e) {
        dispatch(loadEventWorkflowErrorsFailure())
        // todo: probably needs a Notification to the user
        logger.error(e);
    }
}

export const fetchWorkflowErrorDetails = (eventId, workflowId, errorId) => async (dispatch) => {
    try {
        dispatch(loadEventWorkflowErrorDetailsInProgress());

        const data = await axios.get(`/admin-ng/event/${eventId}/workflows/${workflowId}/errors/${errorId}.json`);
        const workflowErrorDetails = await data.data;
        dispatch(loadEventWorkflowErrorDetailsSuccess(workflowErrorDetails));
    } catch (e) {
        dispatch(loadEventWorkflowErrorDetailsFailure())
        // todo: probably needs a Notification to the user
        logger.error(e);
    }
}


// thunks for publications

export const fetchEventPublications = eventId => async dispatch => {
    try {
        dispatch(loadEventPublicationsInProgress());

        let data = await axios.get(`/admin-ng/event/${eventId}/publications.json`);

        let publications = (await data.data);

        // get information about possible publication channels
        data = await axios.get('/admin-ng/resources/PUBLICATION.CHANNELS.json');

        let publicationChannels = await data.data;

        let now = new Date();

        // fill publication objects with additional information
        publications.publications.forEach(publication => {

            publication.enabled =
                !(publication.id === 'engage-live' &&
                    (now < new Date(publications['start-date']) || now > new Date(publications['end-date'])));

            if (publicationChannels[publication.id]) {
                let channel = JSON.parse(publicationChannels[publication.id]);

                if (channel.label) {
                    publication.label = channel.label
                }
                if (channel.icon) {
                    publication.icon = channel.icon;
                }
                if (channel.hide) {
                    publication.hide = channel.hide;
                }
                if (channel.description) {
                    publication.description = channel.description;
                }
                if (channel.order) {
                    publication.order = channel.order;
                }
            }
        });

        dispatch(loadEventPublicationsSuccess(publications.publications));

    } catch (e) {
        dispatch(loadEventPublicationsFailure());
        logger.error(e);
    }
}
