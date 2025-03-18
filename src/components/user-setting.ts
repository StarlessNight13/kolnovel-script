export const userSetting = {
  state: localStorage.getItem("userSettings") === "true",
  setAutoLoader: (autoLoader: boolean) => {
    localStorage.setItem("userSettings", autoLoader.toString());
  },
  toggleAutoLoader: () => {
    const autoLoader = localStorage.getItem("userSettings") === "true";
    localStorage.setItem("userSettings", (!autoLoader).toString());
  },
};
