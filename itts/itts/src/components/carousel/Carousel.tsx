"use client";

import { cn } from "@/lib/utils";
import { Course } from "@/payload-types";
import type { EmblaOptionsType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import React from "react";
import { NextButton, PrevButton, usePrevNextButtons } from "./ArrowButtons";
import { DotButton, useDotButton } from "./DotButton";

type PropType = {
  slides: Course[];
  options?: EmblaOptionsType;
  title: string;
  onClickItem: (id: string) => void;
};

const EmblaCarousel: React.FC<PropType> = (props) => {
  const { slides, options, title, onClickItem } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  console.log(slides);
  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  return (
    <section className="mt-10 mx-auto w-full box-border overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {title}
        </h3>
        <div className="flex items-center gap-3">
          <PrevButton
            onClick={onPrevButtonClick}
            disabled={prevBtnDisabled}
            className="w-10 h-10 rounded-full border border-[#e3dbd8] flex items-center justify-center transition-all duration-200 hover:bg-[#e72929] disabled:opacity-50 group"
          />
          <NextButton
            onClick={onNextButtonClick}
            disabled={nextBtnDisabled}
            className="w-10 h-10 rounded-full border border-[#e3dbd8] flex items-center justify-center transition-all duration-200 hover:bg-[#e72929] disabled:opacity-50 group"
          />
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4 md:-ml-[1.6rem] xl:-ml-[2rem] backface-hidden touch-pan-y touch-pinch-zoom">
          {slides.map((s) => (
            <div
              className="min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] xl:flex-[0_0_33.33%] pl-4 md:pl-[1.6rem] xl:pl-[2rem]"
              key={s.id}
            >
              <div className="flex items-center justify-center select-none">
                <div
                  onClick={() => onClickItem(s.id)}
                  className="relative group cursor-pointer w-[238px] h-[335px] rounded-[12px] border-2 border-transparent transition-all hover:border-[#e72929] duration-200 overflow-hidden bg-gray-200"
                >
                  {typeof s.thumbnail === "object" && s.thumbnail?.url ? (
                    <Image
                      src={s.thumbnail.url}
                      alt={s.thumbnail.alt || `Slide item`}
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="238px"
                      width={238}
                      height={335}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 p-4">
                    <h4 className="text-white text-center font-bold text-xl leading-snug drop-shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 uppercase">
                      {s.courseName}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-[1.8rem] flex justify-center">
        <div className="flex flex-wrap justify-center items-center gap-[0.625rem]">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              onClick={() => onDotButtonClick(index)}
              className={cn(
                "w-[0.625rem] h-[0.625rem] rounded-full transition-all duration-200 cursor-pointer",
                index === selectedIndex
                  ? "bg-[#e72929]"
                  : "bg-[#cfd3d6] hover:bg-[#e72929]",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default EmblaCarousel;
