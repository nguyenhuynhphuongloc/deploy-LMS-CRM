/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useAuth } from "@/app/(app)/_providers/Auth";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_TYPE } from "@/constants";
import { cn, getInitials } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { updateLeadProfile } from "./actions";

const formSchema = z.object({
  fullName: z.string().min(3, {
    message: "Vui lòng nhập họ và tên",
  }),
  type: z.string().min(1, {
    message: "Vui lòng chọn đối tượng",
  }),
  phone: z
    .string()
    .regex(/^(?:\+84|0)(3|5|7|8|9)[0-9]{8}$/, {
      message: "Số điện thoại không hợp lệ",
    })
    .min(1, {
      message: "Vui lòng nhập số điện thoại",
    }),
  email: z
    .string()
    .email({
      message: "Email không hợp lệ",
    })
    .min(1, {
      message: "Vui lòng nhập email",
    }),
  link_facebook: z.string().optional(),
  date_of_birth: z.date({
    required_error: "Vui lòng chọn ngày sinh",
  }),
  avatar: z.string().optional(),
  entrance_score: z.string().optional(),
  commit_score: z.string().optional(),
});

interface ProfileModalProps {
  children: React.ReactNode;
}

const ProfileModal = ({ children }: ProfileModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, setUser } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      type: "",
      phone: "",
      email: "",
      link_facebook: "",
      date_of_birth: undefined,
      avatar: "",
    },
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    if (user?.lead && typeof user.lead === "object") {
      const { lead } = user;
      reset({
        fullName: lead.fullName || "",
        type: lead.type || "",
        phone: lead.phone || "",
        email: lead.email || "",
        link_facebook: lead.link_facebook || "",
        date_of_birth: lead.date_of_birth
          ? new Date(lead.date_of_birth)
          : undefined,
        avatar: (user.avatar as any)?.id || "",
      });
      setAvatarPreview((user.avatar as any)?.url || null);
    }
  }, [user, reset]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.lead) return;

    const leadId =
      typeof user.lead === "string" ? user.lead : (user.lead as any).id;

    if (!leadId) {
      toast.error("Không tìm thấy thông tin định danh học viên.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateLeadProfile({
        leadId,
        userId: user.id,
        data: {
          ...values,
          date_of_birth: values.date_of_birth.toISOString(),
        },
      });

      if (result.success) {
        toast.success("Cập nhật thông tin thành công!");
        // Update local state to reflect changes immediately
        if (user) {
          setUser({
            ...user,
            lead: result.data,
            avatar: avatarPreview
              ? ({
                  url: avatarPreview,
                  id: values.avatar,
                  updatedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                } as any)
              : user.avatar,
          });
        }
        setOpen(false);
      } else {
        toast.error(result.message || "Cập nhật thất bại.");
      }
    } catch (error) {
      toast.error("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[600px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <div className="mb-4 inline-flex w-full items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[0.625rem] text-[#E72929] border bg-red-50">
              <Image
                src="/user-tag.svg"
                alt="user-tag"
                width={21}
                height={21}
              />
            </div>
            <div className="flex flex-col text-left">
              <DialogTitle className="text-lg font-bold">Profile</DialogTitle>
              <DialogDescription>
                Cập nhật và chỉnh sửa thông tin học viên.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group cursor-pointer">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar Preview"
                width={100}
                height={100}
                className="h-[100px] w-[100px] rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full border-2 border-dashed border-gray-300 bg-gray-50 text-2xl font-bold text-gray-400">
                {user?.lead && typeof user.lead === "object"
                  ? getInitials((user.lead as any).fullName)
                  : "?"}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Image
                src="/edit.svg"
                alt="edit"
                width={24}
                height={24}
                className="invert"
              />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                // Preview
                const reader = new FileReader();
                reader.onloadend = () => {
                  setAvatarPreview(reader.result as string);
                };
                reader.readAsDataURL(file);

                // Upload
                const formData = new FormData();
                formData.append("file", file);
                try {
                  const response = await fetch("/api/media", {
                    method: "POST",
                    body: formData,
                  });
                  if (response.ok) {
                    const { doc } = await response.json();
                    form.setValue("avatar", doc.id);
                  } else {
                    toast.error("Tải ảnh thất bại.");
                  }
                } catch (err) {
                  toast.error("Lỗi khi tải ảnh.");
                }
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Click để thay đổi ảnh đại diện
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập họ tên"
                        {...field}
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current occupation</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full rounded-[12px]">
                          <SelectValue placeholder="Chọn công việc" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_TYPE.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal rounded-[12px]",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          captionLayout="dropdown"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="xxxx-xxx-xxx"
                        className="rounded-[12px] h-9"
                        disabled
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="rounded-[12px] h-9"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="link_facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Nhập link Facebook"
                        className="rounded-[12px] h-9"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2">
              <FormField
                control={control}
                name="entrance_score"
                render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel className="inline-block">Điểm đầu vào</FormLabel>
                    <Input
                      type="text"
                      className="rounded-[12px]"
                      {...field}
                      size="md"
                      disabled
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="commit_score"
                render={({ field }) => (
                  <FormItem className="w-[50%]">
                    <FormLabel className="inline-block">
                      Cam kết đầu ra
                    </FormLabel>
                    <Input
                      type="text"
                      className="rounded-[12px]"
                      {...field}
                      size="md"
                      disabled
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="w-full items-center justify-center">
              <Button
                type="button"
                className="flex-1"
                variant={"outline"}
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 font-bold"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
