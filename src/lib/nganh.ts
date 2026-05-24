export const nganhOptions = [
  "Ấu Nhi",
  "Thiếu Nhi",
  "Nghĩa Sĩ",
  "Hiệp Sĩ",
  "Huynh Trưởng",
  "Trợ Tá",
  "Trợ Úy",
  "Tuyên Úy"
];

export function sortNganh(values: string[]) {
  return [...values].sort((a, b) => {
    const aIndex = nganhOptions.indexOf(a);
    const bIndex = nganhOptions.indexOf(b);

    if (aIndex >= 0 && bIndex >= 0) {
      return aIndex - bIndex;
    }

    if (aIndex >= 0) {
      return -1;
    }

    if (bIndex >= 0) {
      return 1;
    }

    return a.localeCompare(b);
  });
}
