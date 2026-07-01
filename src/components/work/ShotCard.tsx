import { Avatar, Column, Media, Row, SmartLink, Tag, Text } from "@once-ui-system/core";

interface ShotCardProps {
  href: string;
  image: string;
  title: string;
  tag?: string;
  avatar?: string;
  priority?: boolean;
}

export const ShotCard: React.FC<ShotCardProps> = ({ href, image, title, tag, avatar, priority }) => {
  return (
    <SmartLink href={href} unstyled style={{ width: "100%" }}>
      <Column fillWidth gap="8">
        <Media
          src={image}
          alt={title}
          radius="l"
          aspectRatio="4 / 3"
          sizes="(max-width: 768px) 100vw, 33vw"
          priority={priority}
        />
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
