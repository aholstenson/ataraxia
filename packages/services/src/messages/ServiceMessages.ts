import { ServiceAvailableMessage } from './ServiceAvailableMessage';
import { ServiceEventEmitMessage } from './ServiceEventEmitMessage';
import { ServiceEventSubscribeMessage } from './ServiceEventSubscribeMessage';
import { ServiceEventUnsubscribeMessage } from './ServiceEventUnsubscribeMessage';
import { ServiceInvokeReply } from './ServiceInvokeReply';
import { ServiceInvokeRequest } from './ServiceInvokeRequest';
import { ServiceListReplyMessage } from './ServiceListReplyMessage';
import { ServiceListRequestMessage } from './ServiceListRequestMessage';
import { ServiceUnavailableMessage } from './ServiceUnavailableMessage';

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
