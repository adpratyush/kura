import { useState } from "react";
import { API_URL } from "./config";

function Register({ onLogin }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Compress and resize image before uploading
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const maxWidth = 1000;
        const maxHeight = 1000;

        let width = img.width;
        let height = img.height;

        // Resize while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(
            maxWidth / width,
            maxHeight / height
          );

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        // Convert to compressed JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }

            const compressedFile = new File(
              [blob],
              "profile.jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          0.8
        );
      };

      img.onerror = () => {
        reject(new Error("Could not load image"));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("username", username);
      formData.append("password", password);

      // Compress profile photo before uploading
      if (photo) {
        const compressedPhoto = await compressImage(photo);

        formData.append(
          "profilePhoto",
          compressedPhoto
        );
      }

      const response = await fetch(
        `${API_URL}/api/users/register`,
        {
          method: "POST",
          body: formData,
        }
      );

      const contentType =
        response.headers.get("content-type");

      let data = {};

      if (
        contentType &&
        contentType.includes("application/json")
      ) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Server response:", text);
      }

      if (!response.ok) {
        setMessage(
          data.message || "Registration failed"
        );
        return;
      }

      setMessage(
        "Account created successfully!"
      );

      // Automatically log user in
      onLogin(data.user);

    } catch (error) {
      console.error("Registration error:", error);

      setMessage(
        "Could not upload profile photo"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <h1>Create Account</h1>

        <p className="auth-subtitle">
          Create your messaging account
        </p>

        <form onSubmit={handleRegister}>

          <div className="photo-upload">

            <div className="profile-preview">

              {photo ? (
                <img
                  src={URL.createObjectURL(photo)}
                  alt="Profile preview"
                />
              ) : (
                <span>👤</span>
              )}

            </div>

            <label className="photo-button">
              Choose Photo

              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const selectedFile =
                    event.target.files[0];

                  if (selectedFile) {
                    setPhoto(selectedFile);
                  }
                }}
              />
            </label>

          </div>

          <label>
            Full Name
          </label>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />

          <label>
            Username
          </label>

          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            required
          />

          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            minLength="6"
            required
          />

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default Register;