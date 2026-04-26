// src/utils/formatDate.js
import moment from "moment";
import "moment/locale/fr";

moment.locale("fr");

export const formatDate = (date) => {
  if (!date) return "";
  return moment(date).format("D MMMM YYYY, HH:mm");
};
