use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// Shape types
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ShapeType {
    Rectangle,
    Circle,
    Diamond,
    Text,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Shape {
    pub id: String,
    #[serde(rename = "type")]
    pub shape_type: ShapeType,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub rotation: f64,
    pub fill: String,
    pub stroke: String,
    pub stroke_width: f64,
    pub text: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Connector {
    pub id: String,
    pub from_shape_id: String,
    pub to_shape_id: String,
    pub from_anchor: String,
    pub to_anchor: String,
    pub stroke: String,
    pub stroke_width: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiagramSettings {
    pub background_color: String,
    pub grid_enabled: bool,
    pub snap_to_grid: bool,
    pub grid_size: f64,
}

impl Default for DiagramSettings {
    fn default() -> Self {
        Self {
            background_color: "#ffffff".to_string(),
            grid_enabled: true,
            snap_to_grid: true,
            grid_size: 20.0,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Diagram {
    pub id: String,
    pub name: String,
    pub shapes: Vec<Shape>,
    pub connectors: Vec<Connector>,
    pub settings: DiagramSettings,
    pub created_at: String,
    pub updated_at: String,
}

// WASM-exposed diagram engine
#[wasm_bindgen]
pub struct DiagramEngine {
    diagram: Diagram,
}

#[wasm_bindgen]
impl DiagramEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(id: &str, name: &str) -> DiagramEngine {
        let now = js_sys::Date::new_0().to_iso_string().as_string().unwrap();
        DiagramEngine {
            diagram: Diagram {
                id: id.to_string(),
                name: name.to_string(),
                shapes: Vec::new(),
                connectors: Vec::new(),
                settings: DiagramSettings::default(),
                created_at: now.clone(),
                updated_at: now,
            },
        }
    }

    #[wasm_bindgen(js_name = fromJson)]
    pub fn from_json(json: &str) -> Result<DiagramEngine, JsValue> {
        let diagram: Diagram = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
        Ok(DiagramEngine { diagram })
    }

    #[wasm_bindgen(js_name = toJson)]
    pub fn to_json(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.diagram)
            .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
    }

    #[wasm_bindgen(js_name = addShape)]
    pub fn add_shape(&mut self, shape_json: &str) -> Result<(), JsValue> {
        let shape: Shape = serde_json::from_str(shape_json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
        self.diagram.shapes.push(shape);
        self.update_timestamp();
        Ok(())
    }

    #[wasm_bindgen(js_name = updateShape)]
    pub fn update_shape(&mut self, shape_id: &str, updates_json: &str) -> Result<(), JsValue> {
        let updates: serde_json::Value = serde_json::from_str(updates_json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

        if let Some(shape) = self.diagram.shapes.iter_mut().find(|s| s.id == shape_id) {
            if let Some(x) = updates.get("x").and_then(|v| v.as_f64()) {
                shape.x = x;
            }
            if let Some(y) = updates.get("y").and_then(|v| v.as_f64()) {
                shape.y = y;
            }
            if let Some(width) = updates.get("width").and_then(|v| v.as_f64()) {
                shape.width = width;
            }
            if let Some(height) = updates.get("height").and_then(|v| v.as_f64()) {
                shape.height = height;
            }
            if let Some(rotation) = updates.get("rotation").and_then(|v| v.as_f64()) {
                shape.rotation = rotation;
            }
            if let Some(fill) = updates.get("fill").and_then(|v| v.as_str()) {
                shape.fill = fill.to_string();
            }
            if let Some(stroke) = updates.get("stroke").and_then(|v| v.as_str()) {
                shape.stroke = stroke.to_string();
            }
            if let Some(stroke_width) = updates.get("strokeWidth").and_then(|v| v.as_f64()) {
                shape.stroke_width = stroke_width;
            }
            if let Some(text) = updates.get("text").and_then(|v| v.as_str()) {
                shape.text = Some(text.to_string());
            }
            self.update_timestamp();
            Ok(())
        } else {
            Err(JsValue::from_str("Shape not found"))
        }
    }

    #[wasm_bindgen(js_name = deleteShape)]
    pub fn delete_shape(&mut self, shape_id: &str) -> Result<(), JsValue> {
        let initial_len = self.diagram.shapes.len();
        self.diagram.shapes.retain(|s| s.id != shape_id);

        // Also remove connectors attached to this shape
        self.diagram.connectors.retain(|c| {
            c.from_shape_id != shape_id && c.to_shape_id != shape_id
        });

        if self.diagram.shapes.len() < initial_len {
            self.update_timestamp();
            Ok(())
        } else {
            Err(JsValue::from_str("Shape not found"))
        }
    }

    #[wasm_bindgen(js_name = addConnector)]
    pub fn add_connector(&mut self, connector_json: &str) -> Result<(), JsValue> {
        let connector: Connector = serde_json::from_str(connector_json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
        self.diagram.connectors.push(connector);
        self.update_timestamp();
        Ok(())
    }

    #[wasm_bindgen(js_name = deleteConnector)]
    pub fn delete_connector(&mut self, connector_id: &str) -> Result<(), JsValue> {
        let initial_len = self.diagram.connectors.len();
        self.diagram.connectors.retain(|c| c.id != connector_id);

        if self.diagram.connectors.len() < initial_len {
            self.update_timestamp();
            Ok(())
        } else {
            Err(JsValue::from_str("Connector not found"))
        }
    }

    #[wasm_bindgen(js_name = updateSettings)]
    pub fn update_settings(&mut self, settings_json: &str) -> Result<(), JsValue> {
        let settings: DiagramSettings = serde_json::from_str(settings_json)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;
        self.diagram.settings = settings;
        self.update_timestamp();
        Ok(())
    }

    #[wasm_bindgen(js_name = getShapes)]
    pub fn get_shapes(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.diagram.shapes)
            .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
    }

    #[wasm_bindgen(js_name = getConnectors)]
    pub fn get_connectors(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.diagram.connectors)
            .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
    }

    #[wasm_bindgen(js_name = getSettings)]
    pub fn get_settings(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.diagram.settings)
            .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
    }

    #[wasm_bindgen(js_name = snapToGrid)]
    pub fn snap_to_grid(&self, x: f64, y: f64) -> Vec<f64> {
        if self.diagram.settings.snap_to_grid {
            let grid = self.diagram.settings.grid_size;
            vec![
                (x / grid).round() * grid,
                (y / grid).round() * grid,
            ]
        } else {
            vec![x, y]
        }
    }

    #[wasm_bindgen(js_name = findShapeAt)]
    pub fn find_shape_at(&self, x: f64, y: f64) -> Option<String> {
        // Reverse iterate to find topmost shape
        for shape in self.diagram.shapes.iter().rev() {
            if x >= shape.x && x <= shape.x + shape.width &&
               y >= shape.y && y <= shape.y + shape.height {
                return Some(shape.id.clone());
            }
        }
        None
    }

    fn update_timestamp(&mut self) {
        self.diagram.updated_at = js_sys::Date::new_0().to_iso_string().as_string().unwrap();
    }
}

// Utility functions
#[wasm_bindgen(js_name = generateId)]
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[wasm_bindgen(js_name = createDefaultShape)]
pub fn create_default_shape(shape_type: &str, x: f64, y: f64) -> Result<String, JsValue> {
    let shape = Shape {
        id: generate_id(),
        shape_type: match shape_type {
            "rectangle" => ShapeType::Rectangle,
            "circle" => ShapeType::Circle,
            "diamond" => ShapeType::Diamond,
            "text" => ShapeType::Text,
            _ => return Err(JsValue::from_str("Invalid shape type")),
        },
        x,
        y,
        width: 100.0,
        height: 100.0,
        rotation: 0.0,
        fill: "#4f46e5".to_string(),
        stroke: "#3730a3".to_string(),
        stroke_width: 2.0,
        text: if shape_type == "text" { Some("Text".to_string()) } else { None },
    };

    serde_json::to_string(&shape)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_diagram() {
        let engine = DiagramEngine::new("test-id", "Test Diagram");
        let json = engine.to_json().unwrap();
        assert!(json.contains("test-id"));
        assert!(json.contains("Test Diagram"));
    }

    #[test]
    fn test_add_shape() {
        let mut engine = DiagramEngine::new("test-id", "Test");
        let shape = create_default_shape("rectangle", 100.0, 100.0).unwrap();
        engine.add_shape(&shape).unwrap();
        let shapes = engine.get_shapes().unwrap();
        assert!(shapes.contains("rectangle"));
    }

    #[test]
    fn test_snap_to_grid() {
        let engine = DiagramEngine::new("test-id", "Test");
        let snapped = engine.snap_to_grid(25.0, 33.0);
        assert_eq!(snapped, vec![20.0, 40.0]);
    }
}
