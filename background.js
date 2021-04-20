chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
        id: "pasteEmail",
        title: "Paste TemporaryMail",
        contexts: ["editable"],
    });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    chrome.tabs.sendMessage(tab.id, {
        pasteEmail: true
    }, function(response) {
        console.log(response)
    })
});
