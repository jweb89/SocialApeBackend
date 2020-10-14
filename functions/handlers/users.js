require("dotenv").config();
const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);

const client = require("twilio")(process.env.ACCOUNTSID, process.env.AUTHTOKEN);

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

//Sign up user
exports.signUp = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
    phone: req.body.phone,
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImgUrl = `https://firebasestorage.googleapis.com/v0/b/socialape-f0c8e.appspot.com/o/no-img.png.png?alt=media`;

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      phoneVerificationCode =
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString();
      client.messages
        .create({
          from: "+12058905683",
          body: "Your verification code is: " + phoneVerificationCode,
          to: newUser.phone,
        })
        .then((message) => console.log(message.sid))
        .catch((err) => console.log(err));

      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: noImgUrl,
        userId,
        phone: newUser.phone,
        verificationCode: phoneVerificationCode,
        isVerified: false,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => res.status(201).json({ token }))
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email in already in use" });
      } else {
        return res.status(500).json({
          general: "Something went wrong, please try again",
        });
      }
    });
};

//Resend Verification Code
exports.resendVerificationCode = (req, res) => {
  const user = {
    handle: req.user.handle,
  };

  db.doc(`/users/${user.handle}`)
    .get()
    .then((doc) => {
      const userData = doc.data();
      if (userData.isVerified) {
        return res.status(404).json({ error: "User phone already verified" });
      }
      const code =
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString() +
        Math.floor(10 * Math.random()).toString();
      db.doc(`/users/${user.handle}`)
        .update({ verificationCode: code })
        .then(
          client.messages
            .create({
              from: "+12058905683",
              body: "Your verification code is: " + code,
              to: userData.phone,
            })

            .then((message) => {
              console.log(message.sid);
              return res.status(200).json({ message: "Code resent" });
            })

            .catch((err) => {
              console.log(err);
            })
        )
        .catch((err) => console.log(err));
    })
    .catch((err) => {
      console.log(err);
      return res.status(404).json({ error: "No phone found" });
    });
};

//Verify Phone Number
exports.phoneVerification = (req, res) => {
  const user = {
    handle: req.user.handle,
    enteredCode: req.body.enteredCode,
  };

  if (user.enteredCode.trim() === "") {
    return res.status(400).json({ body: "Code must not be empty" });
  }

  db.doc(`/users/${user.handle}`)
    .get()
    .then((doc) => {
      userData = doc.data();
      if (doc.exists && userData.verificationCode === user.enteredCode.trim()) {
        db.doc(`/users/${user.handle}`)
          .update({ isVerified: true })
          .then(() => {
            return res
              .status(200)
              .json({ message: "User verified succesfully" });
          })
          .catch((err) => {
            console.log(err);
          });
      } else {
        return res.status(400).json({
          body: "Wrong code, please try again",
        });
      }
    })
    .catch((err) => console.log(err));
};

//log user in
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  console.log(user);

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      //auth/wrong-password
      //auth/user-not-user
      return res
        .status(403)
        .json({ general: "Wrong credentials, please try again" });
    });
};

//Add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.status(200).json({ message: "Details added succesfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Get any user's details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("screams")
          .where("userHandle", "==", req.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ message: "User does not exist" });
      }
    })
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          ...doc.data(),
          screamId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        console.log(doc.data());
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];

      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return (
        db
          .collection("notifications")
          .where("recipient", "==", req.user.handle)
          // .orderBy("createdAt", "desc")
          .limit(10)
          .get()
      );
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          ...doc.data(),
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.updateSettings = (req, res) => {};

//Upload a profile image for user
exports.uploadImage = (req, res) => {
  const busBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new busBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    //my.image.png
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    //4232346546436.png
    imageFileName = `${Math.round(
      Math.random() * 100000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db
          .doc(`/users/${req.user.handle}`)
          .update({ imageUrl })
          .then(() => {
            return db
              .collection("screams")
              .where("userHandle", "==", req.user.handle)
              .get();
          })
          .then((data) => {
            if (data) {
              data.forEach((doc) => {
                db.collection("screams")
                  .doc(doc.id)
                  .update({ userImage: imageUrl });
              });
            }
            return res.json({ message: "Image uploaded succesfully" });
          })
          .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
      });
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notifications marked as read" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
