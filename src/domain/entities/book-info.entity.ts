/** Informations d'un livre (endpoint /:version/:livre/info). */
export interface BookInfo {
  titre?: string;
  abreviation?: string;
  signification?: string;
  auteur?: string;
  theme?: string;
  date?: string;
  introduction?: string;
}