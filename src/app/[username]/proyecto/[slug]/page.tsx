import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Avatar,
  Column,
  Heading,
  Line,
  Media,
  Meta,
  Row,
  Schema,
  SmartLink,
  Tag,
  Text,
} from "@once-ui-system/core";
import { baseURL } from "@/resources";
import { formatDate } from "@/utils/formatDate";
import { ScrollToHash, CustomMDX } from "@/components";
import { getCaseStudy } from "@/lib/caseStudies";
import { prisma } from "@/lib/prisma";

interface CaseStudyPageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const post = getCaseStudy(username, slug);
  if (!post) return {};

  return Meta.generate({
    title: post.metadata.title,
    description: post.metadata.summary,
    baseURL: baseURL,
    image: post.metadata.image || `/api/og/generate?title=${post.metadata.title}`,
    path: `/${username}/proyecto/${slug}`,
  });
}

export default async function PartnerCaseStudy({ params }: CaseStudyPageProps) {
  const { username, slug } = await params;

  const post = getCaseStudy(username, slug);
  if (!post) {
    notFound();
  }

  const author = await prisma.user.findUnique({
    where: { username },
    select: { name: true, imageUrl: true },
  });
  if (!author) {
    notFound();
  }

  return (
    <Column as="section" maxWidth="m" horizontal="center" gap="l">
      <Schema
        as="blogPosting"
        baseURL={baseURL}
        path={`/${username}/proyecto/${slug}`}
        title={post.metadata.title}
        description={post.metadata.summary}
        datePublished={post.metadata.publishedAt}
        dateModified={post.metadata.publishedAt}
        image={
          post.metadata.image || `/api/og/generate?title=${encodeURIComponent(post.metadata.title)}`
        }
        author={{
          name: author.name ?? username,
          url: `${baseURL}/${username}`,
          image: author.imageUrl ? `${baseURL}${author.imageUrl}` : undefined,
        }}
      />
      <Column maxWidth="s" gap="16" horizontal="center" align="center">
        <SmartLink href={`/${username}`}>
          <Text variant="label-strong-m">Proyectos</Text>
        </SmartLink>
        <Text variant="body-default-xs" onBackground="neutral-weak" marginBottom="12">
          {post.metadata.publishedAt && formatDate(post.metadata.publishedAt)}
        </Text>
        <Heading variant="display-strong-m">{post.metadata.title}</Heading>
      </Column>
      <Row marginBottom="32" horizontal="center">
        <Row gap="12" vertical="center">
          <Avatar src={author.imageUrl ?? undefined} size="s" />
          <SmartLink href={`/${username}`}>
            <Text variant="label-default-m" onBackground="brand-weak">
              {author.name ?? username}
            </Text>
          </SmartLink>
          {post.metadata.tag && <Tag size="s" label={post.metadata.tag} variant="neutral" />}
        </Row>
      </Row>
      {post.metadata.images.length > 0 && (
        <Media
          priority
          aspectRatio="16 / 9"
          radius="m"
          alt={post.metadata.title}
          src={post.metadata.images[0]}
        />
      )}
      <Column style={{ margin: "auto" }} as="article" maxWidth="xs">
        <CustomMDX source={post.content} />
      </Column>
      <Column fillWidth horizontal="center" marginTop="40" gap="24">
        <Line maxWidth="40" />
        <SmartLink href={`/${username}`}>
          <Text variant="label-strong-m">Ver más proyectos de {author.name ?? username}</Text>
        </SmartLink>
      </Column>
      <ScrollToHash />
    </Column>
  );
}
