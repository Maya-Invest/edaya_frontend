import { isFamilyFeedbackDetailTabSegment } from './family-feedback-detail-tabs';

export function familyFeedbackDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/family-feedback\/([^/]+)/);
	const id = match?.[1];
	if (!id || isFamilyFeedbackDetailTabSegment(id)) {
		return undefined;
	}
	return id;
}
