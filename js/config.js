(function () {
    const localApiUrl = "https://uniplace-web.vercel.app/";
    const productionApiUrl = "https://uniplace-web.vercel.app/";
    const savedApiUrl = localStorage.getItem("uniplace_api_url");
    const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
    const apiBaseUrl = (savedApiUrl || (isLocalHost ? localApiUrl : productionApiUrl)).replace(/\/$/, "");
    const serverBaseUrl = apiBaseUrl.replace(/\/api$/, "");

    window.UNIPLACE_CONFIG = {
        apiBaseUrl,
        serverBaseUrl
    };
})();
