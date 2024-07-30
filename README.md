# Way2quran.com Nest.js

- Way2Quran provides listening and downloading quran recitations of most popular reciters around the world

- Way2Quran Support for both Arabic and English languages, as well as light and dark mode themes.

---

- Main repository is built using `Express.js`. You can find it [here](https://github.com/anas-nady/way2quran.com)

---

### Technologies Used

- **Nest.js**: A progressive Node.js framework for building efficient and scalable server-side applications.

- **MongoDB**: A NoSQL database for storing user data and recitations.

- **Google Cloud Storage**: For storing and serving recitation files.

- **JWT**: For secure authentication and authorization.

### Installation

- To run the project locally, follow these steps:

  - Clone this repository.
  - Install dependencies using `npm install`.
  - Set up your MongoDB database and Google Cloud Storage.
  - Configure environment variables in `.env` file.

    ```sh
      PORT=3000
      NODE_ENV=DEVELOPMENT

      DB_URI=mongodb-url

      JWT_SECRET_KEY=
      JWT_EXPIRES_IN=

      BUCKET_NAME=
    ```

- Add `cloud-configuration.json` file in the root directory to enable access to Google Cloud services.

- Run the application using `npm run start:dev`
