import { Avatar, Column, Media, Row, SmartLink, Tag, Text } from "@once-ui-system/core";
import styles from "./ShotCard.module.scss";

interface ShotCardProps {
  href: string;
  image: string;
  title: string;
  tag?: string;
  avatar?: string;
  priority?: boolean;
  featured?: boolean;
}

export const ShotCard: React.FC<ShotCardProps> = ({
  href,
  image,
  title,
  tag,
  avatar,
  priority,
  featured,
}) => {
  return (
    <SmartLink href={href} unstyled style={{ width: "100%" }}>
      <Column fillWidth gap="8">
        <Column fillWidth radius="l" overflow="hidden" position="relative">
          <Media
            className={styles.media}
            src={image}
            alt={title}
            aspectRatio="4 / 3"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={priority}
          />
          {featured && (
            <Tag
              position="absolute"
              top="12"
              left="12"
              size="s"
              label="Destacado"
              variant="brand"
            />
          )}
        </Column>
        <Row fillWidth horizontal="between" vertical="center" paddingX="4">
          <Row gap="8" vertical="center">
            {avatar && <Avatar src={avatar} size="s" />}
            <Text variant="label-default-s" onBackground="neutral-strong">
              {title}
            </Text>
          </Row>
          {tag && <Tag size="s" label={tag} variant="neutral" />}
        </Row>
      </Column>
    </SmartLink>
  );
};
