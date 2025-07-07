import React, { useEffect, useState } from "react";
import apiInstance from "../../utils/axios";
import { Link } from "react-router-dom";
import UserData from "../plugin/UserData";
import "./tiktokfeed.css";
import Swal from "sweetalert2";

function Explore() {
  const [videos, setVideos] = useState([]);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [commentValue, setCommentValue] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyValue, setReplyValue] = useState("");

  const userData = UserData();
  const userId = userData?.user_id;

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await apiInstance.get("presentations/");
      setVideos(res.data);
    } catch (error) {
      console.error("Erreur chargement vidéos :", error);
    }
  };

  useEffect(() => {
    const observerOptions = { root: null, rootMargin: "0px", threshold: 0.7 };
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          document.querySelectorAll("video").forEach((v) => {
            if (v !== video) v.pause();
          });
          video.play();
        } else {
          video.pause();
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const videoEls = document.querySelectorAll("video");
    videoEls.forEach((video) => observer.observe(video));

    return () => {
      videoEls.forEach((video) => observer.unobserve(video));
    };
  }, [videos]);

  const handleLike = async (id) => {
    try {
      const res = await apiInstance.post(`presentations/${id}/like/`, {
        user: userId,
      });
      const updatedVideos = videos.map((vid) =>
        vid.id === id ? { ...vid, likes_count: res.data.likes_count } : vid
      );
      setVideos(updatedVideos);
      fetchVideos()
    } catch (err) {
      console.error("Erreur like:", err);
    }
  };

  const handleComment = async (presentationId, content, parentId = null) => {
    try {
      const res = await apiInstance.post("comments/create/", {
        presentation: presentationId,
        content: content,
        user: userId,
        parent: parentId,
      });

      const updatedComments = selectedPresentation.comments.map((comment) => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), res.data],
          };
        }
        return comment;
      });

      // Si parentId existe → c'est une réponse
      if (parentId) {
        setSelectedPresentation({
          ...selectedPresentation,
          comments: updatedComments,
        });
        setReplyValue("");
        setReplyingTo(null);
      } else {
        // Sinon c'est un commentaire principal
        setSelectedPresentation({
          ...selectedPresentation,
          comments: [...selectedPresentation.comments, res.data],
        });
        setCommentValue("");
      }
    } catch (err) {
      console.error("Erreur commentaire:", err);
    }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}/presentation/${id}`;
    navigator.clipboard.writeText(link);
    Swal.fire({
              toast: true,
              position: "bottom",
              icon: "success",
              title: "Lien copié dans le presse-papier",
              showConfirmButton: false,
              timer: 2000,
            });
  };

  const handleCommentIconClick = (presentation) => {
    setSelectedPresentation(presentation);
  };

  const handleCloseCommentOverlay = () => {
    setSelectedPresentation(null);
    setReplyingTo(null);
  };

  return (
    <div className="app-container">
      {/* Top bar */}
      <div className="top-bar">
        <div className="tabs">
          <span className="active">Haul</span>
          <Link to="/suivis" className="text-decoration-none text-white">
            <span>Suivis</span>
          </Link>
          <Link to="/" className="text-decoration-none text-white">
            <span>Accueil</span>
          </Link>
        </div>
        <div className="search-icon">
          <i className="fas fa-search"></i>
        </div>
      </div>

      {/* Feed vidéos */}
      <div className="feed-container">
        {videos.map((item) => (
          <div key={item.id} className="feed-item">
            <video
              src={item.video}
              className="feed-image"
              muted
              loop
              playsInline
              onClick={(e) => {
                const video = e.target;
                video.paused ? video.play() : video.pause();
              }}
            />
            <div className="overlay"></div>

            <div className="info">
              <h3>{item.vendor.name}</h3>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <a href={item.link} target="_blank" rel="noreferrer">
                {item.link}
              </a>
            </div>

            <div className="actions">
              <div className="action-btn" onClick={() => handleLike(item.id)}>
                <i className="fas fa-heart" /> {item.likes_count}
              </div>
              <div className="action-btn" onClick={() => handleCommentIconClick(item)}>
                <i className="fas fa-comment-dots"></i>  <span>{item.comments.length}</span>
              </div>
              <div className="action-btn" onClick={() => copyLink(item.id)}>
                <i className="fas fa-link" />
              </div>
            </div>
          </div>
        ))}

        {/* Navigation bas */}
        <div className="bottom-bar">
          <div className="nav-item">
            <Link to="/vendor/orders/" className="text-decoration-none text-white">
              <i className="fas fa-money-bill-wave"></i>
              <br />
              vendeur
            </Link>
          </div>
          <div className="nav-item add-btn">
            <Link to="/add-product" className="text-decoration-none text-white">
              <i className="fas fa-plus"></i>
            </Link>
          </div>
          <div className="nav-item">
            <Link to="/customer/orders/" className="text-decoration-none text-white">
              <i className="fas fa-shopping-bag"></i>
              <br />
              Acheteur
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay commentaires */}
      {selectedPresentation && (
        <div className="review-overlay">
          <div className="review-panel">
            <button className="btn-close" onClick={handleCloseCommentOverlay}>
              &times;
            </button>
            <h4 className="mb-3">Commentaires</h4>

            {/* Liste des commentaires */}
            <div className="mb-3" style={{ maxHeight: "300px", overflowY: "auto", color: "black" }}>
              {selectedPresentation.comments
              .filter((comment) => comment.parent === null) 
              .map((comment) => (
                <div key={comment.id}>
                  <b>{comment.display_name}</b> : {comment.content}
                  <button
                    className="btn btn-sm btn-link"
                    onClick={() => setReplyingTo(comment.id)}
                  >
                    Répondre
                  </button>
                  {/* Réponses */}
                  {comment?.replies.map((reply) => (
                    <div key={reply.id} style={{marginBottom:"20px", marginLeft: "20px", fontStyle: "italic" }}>
                      ↳ <b>{reply.display_name}</b> : {reply.content}
                    </div>
                  ))}
                  {/* Formulaire de réponse */}
                  {replyingTo === comment.id && (
                    <div className="d-flex gap-2 my-1">
                      <input
                        type="text"
                        placeholder="Votre réponse"
                        className="form-control"
                        value={replyValue}
                        onChange={(e) => setReplyValue(e.target.value)}
                      />
                      <button
                        className="btn btn-success"
                        onClick={() =>
                          replyValue.trim() &&
                          handleComment(selectedPresentation.id, replyValue, comment.id)
                        }
                      >
                        Envoyer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Ajouter un commentaire principal */}
            <div className="d-flex gap-2">
              <input
                type="text"
                placeholder="Votre commentaire"
                className="form-control"
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() =>
                  commentValue.trim() &&
                  handleComment(selectedPresentation.id, commentValue)
                }
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Explore;
