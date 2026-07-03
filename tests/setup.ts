import "@testing-library/react";
import "@testing-library/jest-dom/vitest";

if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:mock-preview";
}

if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
