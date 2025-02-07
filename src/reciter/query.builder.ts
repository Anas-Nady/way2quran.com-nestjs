import { Types } from 'mongoose';

export const hafsAnAsim = 'hafs-an-asim';
export const completedRecitations = 'full-holy-quran';
export const variousRecitations = 'various-recitations';

const recitationsFilter = (
  recitationSlug: string,
  recitationId: string | Types.ObjectId,
) => {
  if (!recitationSlug || !recitationId) {
    return null;
  }

  if (recitationSlug === completedRecitations) {
    return {
      recitations: {
        $elemMatch: {
          recitationInfo: recitationId,
          audioFiles: { $size: 114 },
        },
      },
    };
  }

  if (recitationSlug === variousRecitations) {
    return {
      recitations: {
        $elemMatch: {
          recitationInfo: recitationId,
          audioFiles: { $not: { $size: 114 } },
        },
      },
    };
  }

  return {
    recitations: {
      $elemMatch: { recitationInfo: recitationId },
    },
  };
};

const searchQuery = function (search: string) {
  if (!search) return {};

  const trimmedSearch = search.replace(/\s+/g, ' ').trim();

  return {
    $or: [
      {
        englishName: new RegExp(trimmedSearch, 'i'),
      },
      {
        arabicName: new RegExp(trimmedSearch.replace(/ا/g, '[اأإآ]'), 'i'),
      },
    ],
  };
};

const sortQuery = function (sort: string) {
  const sortBy = {};

  if (!sort) {
    return sortBy;
  }

  const allowedSortFields = [
    'arabicName',
    'totalViewers',
    'number',
    'totalRecitations',
  ];

  const sortFields = sort
    .toString()
    .split(',')
    .map((field) => field.trim());

  const removeLeadingDash = (field: string) => field.replace(/^-/, '');
  sortFields.forEach((field) => {
    if (allowedSortFields.includes(removeLeadingDash(field))) {
      if (field.startsWith('-')) {
        sortBy[removeLeadingDash(field)] = -1;
      } else {
        sortBy[field] = 1;
      }
    }
  });
  return sortBy;
};

export { recitationsFilter, searchQuery, sortQuery };
