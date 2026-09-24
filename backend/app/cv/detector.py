"""
CricketLens AI - Object Detection Module
YOLO-based detection of cricket players, umpires, batsmen and the cricket ball.
Extracts bounding boxes, confidences, and ground contact points.
"""

from typing import List, Dict, Optional, Tuple
import numpy as np
import cv2

class Detection:
    def __init__(
        self,
        bbox: List[float],          # [x1, y1, x2, y2] in pixels
        confidence: float,
        class_id: int,
        class_name: str,
        ground_point: Optional[Tuple[float, float]] = None
    ):
        self.bbox = [float(x) for x in bbox]
        self.confidence = float(confidence)
        self.class_id = int(class_id)
        self.class_name = class_name
        
        # Ground contact point is bottom-center of bounding box: (center_x, bottom_y)
        if ground_point is None:
            cx = (self.bbox[0] + self.bbox[2]) / 2.0
            bottom_y = self.bbox[3]
            self.ground_point = (round(cx, 1), round(bottom_y, 1))
        else:
            self.ground_point = ground_point

    def to_dict(self) -> Dict:
        return {
            "bbox": self.bbox,
            "confidence": round(self.confidence, 3),
            "class_id": self.class_id,
            "class_name": self.class_name,
            "ground_point": self.ground_point
        }

class CricketDetector:
    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        confidence_threshold: float = 0.35,
        ball_confidence_threshold: float = 0.15,
        device: str = "cpu"
    ):
        self.confidence_threshold = confidence_threshold
        self.ball_confidence_threshold = ball_confidence_threshold
        self.device = device
        self.model = None
        self._load_model(model_name)

    def _load_model(self, model_name: str):
        """Loads YOLO model safely with Ultralytics."""
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_name)
        except Exception as e:
            print(f"[CricketDetector] Note: Could not load {model_name} ({e}). Will initialize on first run.")
            self.model = None

    def detect_frame(self, frame: np.ndarray) -> Tuple[List[Detection], Optional[Detection]]:
        """
        Runs object detection on a single frame.
        Returns:
            player_detections: List of player/umpire/person detections
            ball_detection: Optional ball detection
        """
        if self.model is None:
            try:
                from ultralytics import YOLO
                self.model = YOLO("yolov8n.pt")
            except Exception as e:
                # Return empty list if model cannot be loaded
                return [], None

        results = self.model(frame, verbose=False, conf=min(self.confidence_threshold, self.ball_confidence_threshold), device=self.device)
        
        player_detections: List[Detection] = []
        ball_detection: Optional[Detection] = None
        
        if len(results) == 0:
            return player_detections, ball_detection
            
        result = results[0]
        boxes = result.boxes
        
        if boxes is None or len(boxes) == 0:
            return player_detections, ball_detection

        xyxy = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        classes = boxes.cls.cpu().numpy().astype(int)
        names = self.model.names if hasattr(self.model, "names") else {}

        best_ball_conf = 0.0

        for box, conf, cls_id in zip(xyxy, confs, classes):
            name = names.get(cls_id, str(cls_id)).lower()
            
            # Person class (0 in COCO)
            if (cls_id == 0 or "person" in name) and conf >= self.confidence_threshold:
                # Filter out absurdly small noise or entire full-screen bboxes
                w = box[2] - box[0]
                h = box[3] - box[1]
                if h > 15 and w > 8:
                    det = Detection(
                        bbox=[float(x) for x in box],
                        confidence=float(conf),
                        class_id=0,
                        class_name="person"
                    )
                    player_detections.append(det)
                    
            # Sports ball (32 in COCO) or custom ball class
            elif (cls_id == 32 or "ball" in name) and conf >= self.ball_confidence_threshold:
                if conf > best_ball_conf:
                    best_ball_conf = conf
                    ball_detection = Detection(
                        bbox=[float(x) for x in box],
                        confidence=float(conf),
                        class_id=32,
                        class_name="ball",
                        ground_point=((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)
                    )

        return player_detections, ball_detection

