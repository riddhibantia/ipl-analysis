import "@testing-library/jest-dom";

window.scrollTo = () => {};
window.history.replaceState = window.history.replaceState || (() => {});
