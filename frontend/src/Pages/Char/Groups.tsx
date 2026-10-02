import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { Alert, Button, Card, Form, InputGroup, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  changeCharacterGroup,
  CharacterGroup,
  getCharacterGroups,
  GroupCharacter,
  groupQueryKey,
} from "../../api/characterGroups";
import { ErrorLoader, PanelLoader } from "../../Components/Loaders/loaders";

function GroupCard({
  group,
  characters,
  canEdit,
  busy,
  change,
}: {
  group: CharacterGroup;
  characters: GroupCharacter[];
  canEdit: boolean;
  busy: boolean;
  change: (method: "put" | "delete", path: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const candidates = characters
    .filter(
      (character) =>
        !group.character_ids.includes(character.character_id) &&
        character.character_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
    )
    .slice(0, 10);
  return (
    <Card className="my-3">
      <Card.Header className="d-flex align-items-center justify-content-between gap-2">
        <h3 className="h5 mb-0 text-break">{group.name}</h3>
        {canEdit && (
          <Button
            variant="outline-danger"
            size="sm"
            disabled={busy}
            onClick={() => change("delete", `/${group.id}`)}
          >
            {t("Delete group")}
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        <ListGroup className="mb-3">
          {characters
            .filter((character) => group.character_ids.includes(character.character_id))
            .map((character) => (
              <ListGroup.Item
                key={character.character_id}
                className="d-flex align-items-center justify-content-between"
              >
                {character.character_name}
                {canEdit && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={busy}
                    aria-label={t("Remove {{name}} from group", { name: character.character_name })}
                    onClick={() =>
                      change("delete", `/${group.id}/characters/${character.character_id}`)
                    }
                  >
                    −
                  </Button>
                )}
              </ListGroup.Item>
            ))}
        </ListGroup>
        {group.character_ids.length === 0 && <p>{t("No characters in this group.")}</p>}
        {canEdit && (
          <>
            <Form.Label htmlFor={`group-search-${group.id}`}>{t("Add a character")}</Form.Label>
            <Form.Control
              id={`group-search-${group.id}`}
              type="search"
              autoComplete="off"
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search your characters")}
              aria-describedby={`group-results-${group.id}`}
            />
            {search.trim() && (
              <ListGroup id={`group-results-${group.id}`} className="mt-1">
                {candidates.map((character) => (
                  <ListGroup.Item
                    action
                    key={character.character_id}
                    disabled={busy}
                    onClick={() => {
                      change("put", `/${group.id}/characters/${character.character_id}`);
                      setSearch("");
                    }}
                  >
                    {character.character_name}
                  </ListGroup.Item>
                ))}
                {candidates.length === 0 && (
                  <ListGroup.Item>{t("No matching characters.")}</ListGroup.Item>
                )}
              </ListGroup>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default function CharacterGroupsPage() {
  const { t } = useTranslation();
  const { characterID } = useParams();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const { data, isPending, isError } = useQuery({
    queryKey: groupQueryKey(characterID),
    queryFn: () => getCharacterGroups(characterID),
  });
  const mutation = useMutation({
    mutationFn: ({
      method,
      path,
      name,
    }: {
      method: "post" | "put" | "delete";
      path?: string;
      name?: string;
    }) =>
      changeCharacterGroup(characterID, method, path, name === undefined ? undefined : { name }),
    onSuccess: async (_result, variables) => {
      if (variables.method === "post") setName("");
      await client.invalidateQueries({ queryKey: groupQueryKey(characterID) });
    },
  });
  if (isPending) return <PanelLoader />;
  if (isError || !data) return <ErrorLoader />;
  const errorMessage =
    axios.isAxiosError(mutation.error) && typeof mutation.error.response?.data === "string"
      ? mutation.error.response.data
      : t("Unable to save the group. Please try again.");
  return (
    <>
      <h2>{t("Grouping of character")}</h2>
      <p>
        {t(
          "Organize your characters into named groups. A character can belong to more than one group.",
        )}
      </p>
      {mutation.isError && (
        <Alert variant="danger" role="alert">
          {errorMessage}
        </Alert>
      )}
      {data.can_edit ? (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ method: "post", name: name.trim() });
          }}
        >
          <Form.Label htmlFor="new-group-name">{t("Group name")}</Form.Label>
          <InputGroup>
            <Form.Control
              id="new-group-name"
              required
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-describedby="group-name-help"
            />
            <Button
              type="submit"
              disabled={mutation.isPending || !name.trim() || data.groups.length >= 50}
            >
              {t("Add new group")}
            </Button>
          </InputGroup>
          <Form.Text id="group-name-help">
            {t(
              "1–60 characters; up to 50 groups. Names must be unique. No control characters or angle brackets.",
            )}
          </Form.Text>
        </Form>
      ) : (
        <Alert variant="info">{t("Only the account owner can edit groups.")}</Alert>
      )}
      {data.groups.length === 0 && <p className="my-3">{t("No groups yet.")}</p>}
      {data.groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          characters={data.characters}
          canEdit={data.can_edit}
          busy={mutation.isPending}
          change={(method, path) => mutation.mutate({ method, path })}
        />
      ))}
    </>
  );
}
