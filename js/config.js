(function () {
    const localApiUrl = "http://localhost:3000/api";
    const productionApiUrl = "https://uniplace.up.railway.app/api";

    const savedApiUrl = localStorage.getItem("uniplace_api_url");

    const isLocalHost = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);

    const apiBaseUrl = (savedApiUrl || (isLocalHost ? localApiUrl : productionApiUrl)).replace(/\/$/, "");
    const serverBaseUrl = apiBaseUrl.replace(/\/api$/, "");

    window.UNIPLACE_CONFIG = {
        apiBaseUrl,
        serverBaseUrl
    };
})();