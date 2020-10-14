let db = {
  users: [
    {
      userId: "adsa;dhf;klash",
      email: "user@email.cmo",
      handle: "user",
      createdAt: "time",
      imageUrl: "image/dafsd/adfa",
      bio: "Hello, my name is user",
      website: "https://hadsfal",
      location: "London,UK",
    },
  ],
  screams: [
    {
      userHandle: "user",
      body: "this is a sample scream",
      craetedAt: "time",
      likeCount: 5,
      commentCount: 3,
    },
  ],
  comments: [
    {
      userHandle: "user",
      screamId: "dajd;fajsk",
      body: "comment",
      createdAt: "time",
    },
  ],
  notification: [
    {
      recipient: "user",
      sender: "john",
      read: "true/false",
      screamId: "djafkdafhsdfhja;k",
      type: "like/comment",
      createdAt: "time",
    },
  ],
};

const userDetails = {
  //Redux data
  credentials: {
    userId: "jsadfajs;dfkjk;sajd",
    email: "user@email.com",
    handle: "user",
    createdAt: "time",
    imageUrl: "url",
    bio: "bio",
    website: ".com",
    location: "canton",
  },
  like: [
    {
      userHandle: "user",
      screamId: "dafhasd;fh;kl",
    },
    {
      userHandle: "user",
      screamId: "screamId",
    },
  ],
};
