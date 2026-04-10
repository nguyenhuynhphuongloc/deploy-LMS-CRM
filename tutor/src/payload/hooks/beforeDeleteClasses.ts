import type { CollectionBeforeDeleteHook } from "payload";

export const beforeDeleteClasses: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const { payload } = req;
  // Cleanup related records to avoid foreign key constraints and orphans
  const deleteOptions = {
    req,
    overrideAccess: true,
  };

  // Delete attendance records
  const { totalDocs: attendanceCount } = await payload.count({
    collection: "attendanceRecords",
    where: {
      class: {
        equals: id,
      },
    },
  });
  if (attendanceCount > 0) {
    await payload.delete({
      collection: "attendanceRecords",
      where: {
        class: {
          equals: id,
        },
      },
      ...deleteOptions,
    });
  }

  // Delete student care records
  const { totalDocs: careCount } = await payload.count({
    collection: "care",
    where: {
      class_ref: {
        equals: id,
      },
    },
  });
  if (careCount > 0) {
    await payload.delete({
      collection: "care",
      where: {
        class_ref: {
          equals: id,
        },
      },
      ...deleteOptions,
    });
  }

  // Delete feedback records
  const { totalDocs: feedbackCount } = await payload.count({
    collection: "feedback",
    where: {
      class: {
        equals: id,
      },
    },
  });
  if (feedbackCount > 0) {
    await payload.delete({
      collection: "feedback",
      where: {
        class: {
          equals: id,
        },
      },
      ...deleteOptions,
    });
  }

  // Delete homework assignments
  const { totalDocs: homeworkCount } = await payload.count({
    collection: "homework-assignments",
    where: {
      class: {
        equals: id,
      },
    },
  });
  if (homeworkCount > 0) {
    await payload.delete({
      collection: "homework-assignments",
      where: {
        class: {
          equals: id,
        },
      },
      ...deleteOptions,
    });
  }
};

export default beforeDeleteClasses;
