import { useTranslation } from "react-i18next";
import { SkillBlock } from "./SkillBlock";
import { SkillBlockKey } from "./SkillBlockKey";
// import "./doctrine.css";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useState } from "react";
import { DoctrineSkillList } from "./DoctrineTypes";

export const DoctrineModal = ({
  show,
  setShow,
  name,
  skill_reqs,
  all_skill_reqs,
  skill_list,
}: {
  show: boolean;
  setShow: (show: boolean) => void;
  name: string;
  skill_reqs: Record<string, number>;
  all_skill_reqs?: Record<string, number>;
  skill_list: DoctrineSkillList;
}) => {
  const { t } = useTranslation();
  const completed = Object.keys(skill_reqs).length === 0;
  const [showTrainedSkills, setShowTrainedSkills] = useState(completed);
  const requiredSkills = all_skill_reqs ?? skill_reqs;
  const hasCompleteRequirements = all_skill_reqs !== undefined;
  const hasTrainedSkills = Object.keys(requiredSkills).some(
    (skill) => !(skill in skill_reqs),
  );
  const displayedSkills = showTrainedSkills ? requiredSkills : skill_reqs;

  const toggleLevel = () => {
    setShow(!show);
  };

  return (
    <Modal show={show} onHide={() => toggleLevel()}>
      <Modal.Header closeButton>
        <Modal.Title>
          {name} -{" "}
          {showTrainedSkills ? t("Required Skills") : t("Missing Skills")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {hasCompleteRequirements && (
          <Form.Check
            type="switch"
            id="show-trained-skills"
            className="mb-3"
            label={t("Show Trained Skills")}
            checked={showTrainedSkills}
            disabled={!hasTrainedSkills}
            onChange={(event) => setShowTrainedSkills(event.target.checked)}
          />
        )}
        {Object.keys(displayedSkills).length === 0 ? (
          <p>{t("All Skills Trained")}</p>
        ) : (
          Object.entries(displayedSkills).map(([skill, requiredLevel]) => {
            let trainedLevel = 0;
            let activeLevel = 0;
            if (skill_list[skill]) {
              activeLevel = skill_list[skill].active_level;
              trainedLevel = skill_list[skill].trained_level;
            }
            return (
              <SkillBlock
                key={skill}
                skill={skill}
                level={requiredLevel}
                active={activeLevel}
                trained={trainedLevel}
                className="w-100"
              />
            );
          })
        )}

        <hr />
        <SkillBlockKey />
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={() => toggleLevel()}>{t("Close")}</Button>
      </Modal.Footer>
    </Modal>
  );
};
