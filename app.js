if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
      const status = document.getElementById("status");
      if (status) {
        status.textContent = "Files are back and offline support is enabled.";
      }
    } catch (error) {
      const status = document.getElementById("status");
      if (status) {
        const details = error instanceof Error ? ` (${error.message})` : "";
        status.textContent = `Files are back, but offline support could not be enabled.${details}`;
      }
      console.error(error);
    }
  });
}
