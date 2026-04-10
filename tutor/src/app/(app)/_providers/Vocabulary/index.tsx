/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-empty-function */
"use client";

import type { Word as WordUI } from "@/containers/vocabulary/Columns";
import type {
  PersonalVocab,
  VocabProgress,
  Vocabulary,
  Word,
} from "@/payload-types";
import { Where } from "payload";
import { stringify } from "qs-esm";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../Auth";

const VocabularyContext = createContext<{
  topics: Vocabulary[];
  selectedWords: WordUI[];
  collections: PersonalVocab[];
  setCollections: (collections: PersonalVocab[]) => void;
  setTopics: (topics: Vocabulary[]) => void;
  setSelectedWords: (words: WordUI[]) => void;
  progress: string[] | null;
  setProgress: (words: string[] | null) => void;
  fetchCollections: () => void;
}>({
  topics: [],
  selectedWords: [],
  collections: [],
  setCollections: () => {},
  setSelectedWords: () => {},
  setTopics: () => {},
  progress: [],
  setProgress: () => {},
  fetchCollections: () => {},
});

export const VocabularyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [topics, setTopics] = useState<Vocabulary[]>([]);
  const [collections, setCollections] = useState<PersonalVocab[]>([]);
  const [selectedWords, setSelectedWords] = useState<WordUI[]>([]);
  const [progress, setProgress] = useState<null | string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch("/api/vocabulary?limit=1000");
        const data = (await response.json()) as { docs: Vocabulary[] };
        setTopics(data.docs);
      } catch (error) {
        console.error("Failed to fetch vocabulary topics:", error);
      }
    };
    fetchTopics();
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      const stringifiedQuery = stringify(
        {
          where: { user: { equals: user?.id } },
          limit: 0,
          select: { word: true },
        },
        { addQueryPrefix: true },
      );
      try {
        const progress = await fetch(`/api/vocab-progress${stringifiedQuery}`);
        const progressData = (await progress.json()) as {
          docs: VocabProgress[];
        };

        if (!progressData?.docs || progressData.docs.length === 0) {
          setProgress([]);
          return;
        }

        const firstDoc = progressData.docs[0];
        if (!firstDoc?.word || !Array.isArray(firstDoc.word)) {
          setProgress([]);
          return;
        }

        const wordIds: string[] = firstDoc.word
          .map((w: string | Word) => {
            if (typeof w === "string") return w;
            return w.id;
          })
          .filter((id): id is string => !!id);

        setProgress(wordIds);
      } catch (error) {
        console.error("Failed to fetch vocabulary progress:", error);
      }
    };
    if (user?.id) fetchProgress();
  }, [user?.id]);

  const fetchCollections = async () => {
    if (!user) return;
    const query: Where = { user: { equals: user?.id } };
    const stringifiedQuery = stringify(
      { where: query, limit: 1000 },
      { addQueryPrefix: true },
    );
    try {
      const response = await fetch(`/api/personal-vocab${stringifiedQuery}`);
      const data = (await response.json()) as { docs: PersonalVocab[] };
      setCollections(data.docs);
    } catch (error) {
      console.error("Failed to fetch vocabulary topics:", error);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [user]);

  return (
    <VocabularyContext.Provider
      value={{
        topics,
        setTopics,
        selectedWords,
        setSelectedWords,
        collections,
        setCollections,
        progress,
        setProgress,
        fetchCollections,
      }}
    >
      {children}
    </VocabularyContext.Provider>
  );
};

export const useVocabulary = () => useContext(VocabularyContext);
