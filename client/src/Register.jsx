import { useState } from "react";

const API_URL = "http://localhost:5001";

function Register({ onLogin }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("username", username);
      formData.append("password", password);

      if (photo) {
        formData.append("profilePhoto", photo);
      }

      const response = await fetch(
        `${API_URL}/api/users/register`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }

      setMessage("Account created successfully!");

      // Automatically log the user in
      onLogin(data.user);

    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server");
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
                onChange={(event) =>
                  setPhoto(event.target.files[0])
                }
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
            {loading ? "Creating..." : "Create Account"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default Register;