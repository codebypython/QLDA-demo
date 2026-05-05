# YOLOv8 Datasets & Pre-trained Models

## Chiến lược MVP
Dùng `yolov8n.pt` (nano, pre-trained trên COCO 80 classes) làm model mặc định.
Khi có dataset riêng → fine-tune cho 6 classes mục tiêu.

## 6 Classes Mục Tiêu
| ID | Class | Mô tả |
|----|-------|--------|
| 0 | `littering` | Xả rác sai quy định |
| 1 | `pothole` | Ổ gà trên đường |
| 2 | `broken_lamp` | Cột đèn / đèn đường hỏng |
| 3 | `vandalism` | Phá hoại tài sản công |
| 4 | `flooding` | Ngập nước |
| 5 | `crowd` | Tụ tập đông người bất thường |

## Datasets Có Sẵn

### 1. Pothole Detection (Roboflow)
- **Nguồn**: https://universe.roboflow.com/ (search "pothole detection")
- **Kích thước**: ~5000 ảnh
- **Classes**: pothole
- **Format**: Download trực tiếp dạng YOLOv8
- **Cách tải**:
  1. Vào Roboflow Universe → search "pothole"
  2. Chọn dataset phù hợp → Download → chọn format YOLOv8

### 2. TACO - Trash Annotations in Context
- **Nguồn chính**: https://github.com/pedropro/TACO
- **Bản YOLO-ready**: https://huggingface.co/datasets/Zesky665/TACO
- **Kích thước**: ~1500 ảnh, 60 sub-classes rác
- **Ghi chú**: Cần group lại thành 1 class "littering"

### 3. RDD2022 - Road Damage Detection
- **Nguồn**: Kaggle (search "Road Damage Detection 2022")
- **Kích thước**: ~47,000 ảnh
- **Classes**: 4 loại hư hỏng mặt đường (D00, D10, D20, D40)
- **Ghi chú**: Dataset lớn nhất, chuẩn nghiên cứu quốc tế

### 4. Street Lamp Detection (Roboflow)
- **Nguồn**: https://universe.roboflow.com/ (search "street lamp")
- **Kích thước**: ~1000 ảnh
- **Classes**: broken/working lamp
- **Ghi chú**: Community datasets, chất lượng có thể khác nhau

## Quy Trình Fine-tune

```bash
# 1. Cài Ultralytics
pip install ultralytics

# 2. Tải dataset (ví dụ từ Roboflow)
# Download về thư mục datasets/pothole/

# 3. Train
yolo detect train \
  data=datasets/pothole/data.yaml \
  model=yolov8n.pt \
  epochs=100 \
  imgsz=640 \
  batch=16

# 4. Copy model đã train vào dự án
cp runs/detect/train/weights/best.pt ai-service/models/best.pt
```

## Ghi Chú
- MVP dùng `yolov8n.pt` pre-trained (không cần dataset riêng ban đầu)
- Khi có model custom → đổi biến `YOLO_MODEL_PATH=models/best.pt` trong `.env`
