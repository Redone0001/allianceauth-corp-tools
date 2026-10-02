import axios from "axios";
import Cookies from "js-cookie";

export type CharacterGroup = { id: number; name: string; character_ids: number[] };
export type GroupCharacter = { character_id: number; character_name: string };
export type CharacterGroups = {
  can_edit: boolean;
  groups: CharacterGroup[];
  characters: GroupCharacter[];
};
export const groupQueryKey = (id: string | undefined) => ["character-groups", id];
export async function getCharacterGroups(id: string | undefined): Promise<CharacterGroups> {
  return (await axios.get(`/audit/api/account/${Number(id) || 0}/groups`)).data;
}
export async function changeCharacterGroup(
  id: string | undefined,
  method: "post" | "put" | "delete",
  path = "",
  data?: { name: string },
) {
  return axios.request({
    url: `/audit/api/account/${Number(id) || 0}/groups${path}`,
    method,
    data,
    headers: { "X-CSRFToken": Cookies.get("csrftoken") },
  });
}
