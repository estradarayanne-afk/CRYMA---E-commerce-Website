export function getRiderChatRefreshState(currentConversation, { response, requestError } = {}) {
    if (requestError) {
        return {
            conversation: currentConversation,
            error: requestError.response?.data?.message || "We couldn't load rider messages.",
        };
    }

    return {
        conversation: response?.data?.data || null,
        error: "",
    };
}
