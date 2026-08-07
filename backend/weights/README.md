# YOLO weights

Place your fine-tuned checkpoint here as:

```
duct_yolo.pt
```

Train after labeling several different plans:

```bash
docker compose exec backend python train_yolo.py
```

Until this file exists, upload uses YOLO-World open-vocab as a bootstrap
(expect weak results on CAD drawings — fine-tuning is required for production).
