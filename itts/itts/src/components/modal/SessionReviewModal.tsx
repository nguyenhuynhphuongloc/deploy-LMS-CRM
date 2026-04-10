import { createSessionFeedback } from "@/app/(app)/(authenticated)/student/exercise/actions";
import { useAuth } from "@/app/(app)/_providers/Auth";
import { Button } from "@/components/ui/button";
import { SESSION_FEEDBACK_OPTIONS } from "@/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

const schema = SESSION_FEEDBACK_OPTIONS.reduce<Record<string, z.ZodString>>(
  (acc, cur) => {
    acc[cur.name] = z.string({
      required_error:
        cur.type === "textarea"
          ? "Vui lòng nhập câu trả lời"
          : "Vui lòng chọn một câu trả lời",
    });
    return acc;
  },
  {
    overall_score: z.string({
      required_error: "Vui lòng chọn một câu trả lời",
    }),
  } as any,
);

const formSchema = z.object(schema);

const SessionReviewModal = ({
  children,
  onSubmit,
  classId,
  session,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  children: React.ReactNode;
  onSubmit: (data: z.infer<typeof formSchema>) => Promise<void>;
  classId: string;
  session: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!user || !classId || !session) return;

    const { success } = await createSessionFeedback({
      userId: user.id,
      classId,
      session,
      feedbackData: data,
    });

    if (success) {
      await onSubmit(data);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="font-sans max-w-[800px] overflow-y-auto max-h-[100vh]">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
            <DialogHeader>
              <DialogTitle className="text-[24px] font-bold mb-6">
                Đánh giá buổi học
              </DialogTitle>
              <DialogDescription className="text-[#6D737A] text-[16px] flex flex-col gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Overall Score của tiết học hôm nay{" "}
                      <span className="text-red-500">*</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[16px] whitespace-nowrap self-end">
                        Rất tệ
                      </span>
                      <FormField
                        control={form.control}
                        name="overall_score"
                        rules={{ required: true }}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                defaultValue={field.value}
                                className="flex justify-between mt-4 w-full px-10"
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <div
                                    key={value}
                                    className="flex flex-col items-center space-y-1 pb-1"
                                  >
                                    <Label
                                      htmlFor={`r-${value}`}
                                      className="mb-5"
                                    >
                                      {value}
                                    </Label>
                                    <RadioGroupItem value={String(value)} />
                                  </div>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <span className="text-[16px] whitespace-nowrap self-end">
                        Rất tốt
                      </span>
                    </div>
                  </CardContent>
                </Card>
                {SESSION_FEEDBACK_OPTIONS.map(
                  ({ id, title, options, type, name }) => (
                    <Card key={id}>
                      <CardHeader>
                        <CardTitle>
                          {title} <span className="text-red-500">*</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name={name}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <FormItem className="">
                              <FormControl>
                                {type === "textarea" ? (
                                  <Textarea
                                    rows={4}
                                    placeholder="Câu trả lời của bạn"
                                    {...field}
                                  />
                                ) : (
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    defaultValue={field.value}
                                    className="flex flex-col"
                                  >
                                    {options?.map(({ value, label }) => (
                                      <FormItem
                                        className="flex items-center gap-3"
                                        key={value}
                                      >
                                        <FormControl>
                                          <RadioGroupItem value={value} />
                                        </FormControl>
                                        <FormLabel className="!mt-0">
                                          {label}
                                        </FormLabel>
                                      </FormItem>
                                    ))}
                                  </RadioGroup>
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ),
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                className="rounded-[12px] text-[16px] font-bold"
                onClick={() => setOpen(false)}
                variant="outline"
                size="xl"
              >
                Đóng
              </Button>
              <Button
                disabled={form.formState.isSubmitting}
                type="submit"
                className="bg-[#E72929] rounded-[12px] text-[16px] font-bold"
                size="xl"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Gửi và làm bài
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SessionReviewModal;
