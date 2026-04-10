/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
"use client";

import { useAuth } from "@/app/(app)/_providers/Auth";
import { successToast } from "@/components/toast/toast";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { PersonalVocab } from "@/payload-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { stringify } from "qs-esm";
import { useCallback, useMemo } from "react";

import PageLoading from "@/components/PageLoading";
const CardVocabulary = dynamic(
  () => import("@/components/card/card-vocabulary"),
  {
    ssr: false,
  },
);
const CreatePersonalCollectionModal = dynamic(
  () => import("@/components/modal/CreatePersonalCollectionModal"),
  { ssr: false },
);

export default function CustomCollection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const stringifiedQuery = useMemo(
    () =>
      stringify(
        { where: { user: { equals: user?.id } }, limit: 0 },
        { addQueryPrefix: true },
      ),
    [user?.id],
  );

  const { data, isLoading } = useQuery<{ docs: PersonalVocab[] }>({
    queryKey: ["custom_collection", user?.id],
    queryFn: () =>
      fetch(`/api/personal-vocab${stringifiedQuery}`).then((res) => res.json()),
    enabled: !!user?.id,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const handleCreateCollection = useCallback(
    async (payload: PersonalVocab) => {
      try {
        const req = await fetch("/api/personal-vocab", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await req.json();
        if (data.message) {
          successToast(data.message);
        }
      } catch (err: any) {
        throw new Error(err.message);
      } finally {
        queryClient.invalidateQueries({
          queryKey: ["custom_collection", user?.id],
        });
      }
    },
    [queryClient, user?.id],
  );

  if (isLoading || user === undefined) return <PageLoading />;

  return (
    <div>
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-[#E72929]" asChild>
              <Link href="/student/vocabulary"> Bộ sưu tập từ vựng</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[#E72929]" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-[#6D737A]">
              YOUR COLLECTION
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex justify-between w-full mb-6">
        <p className="text-[24px] font-bold">Bộ sưu tập từ vựng của bạn</p>
        <CreatePersonalCollectionModal onSubmit={handleCreateCollection}>
          <Button className="" size="lg" variant="light">
            <PlusIcon /> Create
          </Button>
        </CreatePersonalCollectionModal>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {!data?.docs || data?.docs.length === 0 ? (
          <div className="text-center col-span-4">Chưa có bộ sưu tập nào</div>
        ) : (
          data?.docs.map((topic: PersonalVocab) => (
            <CardVocabulary data={topic} key={topic.id} />
          ))
        )}
      </div>
    </div>
  );
}
