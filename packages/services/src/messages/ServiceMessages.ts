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
	'service:list-request': ServiceListRequestMessage;
	'service:list-reply': ServiceListReplyMessage;

	'service:invoke-request': ServiceInvokeRequest;
	'service:invoke-reply': ServiceInvokeReply;

	'service:available': ServiceAvailableMessage;
	'service:unavailable': ServiceUnavailableMessage;

	'service:event-subscribe': ServiceEventSubscribeMessage;
	'service:event-unsubscribe': ServiceEventUnsubscribeMessage;
	'service:event-emit': ServiceEventEmitMessage;
}
