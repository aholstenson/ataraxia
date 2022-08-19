import { ServiceAvailableMessage } from './ServiceAvailableMessage.js';
import { ServiceEventEmitMessage } from './ServiceEventEmitMessage.js';
import { ServiceEventSubscribeMessage } from './ServiceEventSubscribeMessage.js';
import { ServiceEventUnsubscribeMessage } from './ServiceEventUnsubscribeMessage.js';
import { ServiceInvokeReply } from './ServiceInvokeReply.js';
import { ServiceInvokeRequest } from './ServiceInvokeRequest.js';
import { ServiceListReplyMessage } from './ServiceListReplyMessage.js';
import { ServiceListRequestMessage } from './ServiceListRequestMessage.js';
import { ServiceUnavailableMessage } from './ServiceUnavailableMessage.js';

/**
 * Types of messages used by Services.
 */
export interface ServiceMessages {
	'at:service:list-request': ServiceListRequestMessage;
	'at:service:list-reply': ServiceListReplyMessage;

	'at:service:invoke-request': ServiceInvokeRequest;
	'at:service:invoke-reply': ServiceInvokeReply;

	'at:service:available': ServiceAvailableMessage;
	'at:service:unavailable': ServiceUnavailableMessage;

	'at:service:event-subscribe': ServiceEventSubscribeMessage;
	'at:service:event-unsubscribe': ServiceEventUnsubscribeMessage;
	'at:service:event-emit': ServiceEventEmitMessage;
}
