import { Fragment, ReactNode, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { Alert, Card, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { getCharacterGroups, groupQueryKey } from "../../api/characterGroups";

export function GroupedCharacters<T extends { character: { character_id: number } }>({
  items,
  children,
}: {
  items: T[];
  children: (items: T[]) => ReactNode;
}) {
  const { t } = useTranslation();
  const { characterID } = useParams();
  const [grouped, setGrouped] = useState(false);
  const id = useId();
  const { data, isPending, isError } = useQuery({
    queryKey: groupQueryKey(characterID),
    queryFn: () => getCharacterGroups(characterID),
    enabled: grouped,
  });
  const assigned = new Set(data?.groups.flatMap((group) => group.character_ids));
  const sections = [
    ...(data?.groups.map((group) => ({
      id: String(group.id),
      name: group.name,
      items: items.filter((item) => group.character_ids.includes(item.character.character_id)),
    })) ?? []),
    {
      id: "ungrouped",
      name: t("Ungrouped"),
      items: items.filter((item) => !assigned.has(item.character.character_id)),
    },
  ];
  return (
    <>
      <Form.Check
        className="my-3"
        type="switch"
        role="switch"
        id={id}
        label={t("Display by group")}
        checked={grouped}
        onChange={(event) => setGrouped(event.target.checked)}
      />
      {grouped && isError && (
        <Alert variant="warning">{t("Unable to load groups. Showing regular view.")}</Alert>
      )}
      {grouped && isPending && <p role="status">{t("Loading groups…")}</p>}
      {grouped && data && !isError ? (
        sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <Card key={section.id} className="my-3">
              <Card.Header as="h3" className="h5 text-break">
                {section.name}
              </Card.Header>
              <Card.Body className="overflow-auto">{children(section.items)}</Card.Body>
            </Card>
          ))
      ) : (
        <Fragment>{children(items)}</Fragment>
      )}
    </>
  );
}
