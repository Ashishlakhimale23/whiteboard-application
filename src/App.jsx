import { useRef, useState, useEffect, useCallback } from 'react';
function isPointOnQuadraticCurve(x0, y0, x1, y1, x2, y2, px, py, tolerance = 5) {
  // Function to evaluate x and y at a given t
  function quadraticBezier(t, p0, p1, p2) {
    return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  }
  // Check multiple t values to find if the point lies on the curve
  const steps = 1000;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = quadraticBezier(t, x0, x1, x2);
    const y = quadraticBezier(t, y0, y1, y2);

    if (Math.abs(x - px) <= tolerance && Math.abs(y - py) <= tolerance) {
      return true; // The point is on the curve
    }
  }
  return false; // The point is not on the curve
}

const getonwhichedge = (shape, mouseX, mouseY) => {
 const padding = 5; // Adjusted to match your drawing code
  const cornerRadius = 5; // Matches the radius of corner circles in your drawing code
  const { x, y, x1, y1, tool } = shape;
  const verticalTolerance = 10
  const horizontalTolerance = 10
  
  if (tool === "Circle") {
    const radius = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));
    const left = x - radius - padding;
    const right = x + radius + padding;
    const top = y - radius - padding;
    const bottom = y + radius + padding;

    // Check corners first
    if (Math.abs(mouseX - left) <= cornerRadius && Math.abs(mouseY - top) <= cornerRadius) {
      return "nw-resize";
    } else if (Math.abs(mouseX - right) <= cornerRadius && Math.abs(mouseY - top) <= cornerRadius) {
      return "ne-resize";
    } else if (Math.abs(mouseX - left) <= cornerRadius && Math.abs(mouseY - bottom) <= cornerRadius) {
      return "sw-resize";
    } else if (Math.abs(mouseX - right) <= cornerRadius && Math.abs(mouseY - bottom) <= cornerRadius) {
      return "se-resize";
    }

    // Then check edges
    const edgeTolerance = cornerRadius; // Use the same tolerance as corner radius
    if (Math.abs(mouseY - top) <= edgeTolerance && mouseX > left && mouseX < right) {
      return "n-resize";
    } else if (Math.abs(mouseY - bottom) <= edgeTolerance && mouseX > left && mouseX < right) {
      return "s-resize";
    } else if (Math.abs(mouseX - left) <= edgeTolerance && mouseY > top && mouseY < bottom) {
      return "w-resize";
    } else if (Math.abs(mouseX - right) <= edgeTolerance && mouseY > top && mouseY < bottom) {
      return "e-resize";
    }

    // Check if inside the circle
    const distanceFromCenter = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
    if (distanceFromCenter <= radius) {
      return "move";
    }

    return "default";
  } 
  // Determine the actual top, bottom, left, and right coordinates
  const left = Math.min(x, x1) - padding;
  const right = Math.max(x, x1) + padding;
  const top = Math.min(y, y1) - padding;
  const bottom = Math.max(y, y1) + padding;

  // Check for cursor position relative to the edges and corners
  if (Math.abs(mouseY - top) <= verticalTolerance && mouseX >= left && mouseX <= right) {
    return "n-resize"; // Top edge
  } else if (Math.abs(mouseY - bottom) <= verticalTolerance && mouseX >= left && mouseX <= right) {
    return "s-resize"; // Bottom edge
  } else if (Math.abs(mouseX - left) <= horizontalTolerance && mouseY >= top && mouseY <= bottom) {
    return "w-resize"; // Left edge 
  } else if (Math.abs(mouseX - right) <= horizontalTolerance && mouseY >= top && mouseY <= bottom) {
    return "e-resize";  // Right edge
  } else if (Math.abs(mouseX - left) <= cornerRadius && Math.abs(mouseY - top) <= cornerRadius) {
    return "nw-resize";  // Top-left corner
  } else if (Math.abs(mouseX - right) <= cornerRadius && Math.abs(mouseY - top) <= cornerRadius) {
    return "ne-resize";  // Top-right corner
  } else if (Math.abs(mouseX - left) <= cornerRadius && Math.abs(mouseY - bottom) <= cornerRadius) {
    return "sw-resize";  // Bottom-left corner
  } else if (Math.abs(mouseX - right) <= cornerRadius && Math.abs(mouseY - bottom) <= cornerRadius) {
    return "se-resize";  // Bottom-right corner
  } else if (mouseX > left && mouseX < right && mouseY > top && mouseY < bottom) {
    return "move";  // Inside the rectangle
  } else {
    return "default";
  }
};


function App() {
  let canvasRef = useRef(null);
  let ctxRef = useRef(null);
  let isDrawingRef = useRef(false);
  let startPoint = useRef({ x: 0, y: 0 });
  let [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  let [tool, setTool] = useState("");
  let [shapes, setShapes] = useState([]);
  let [dragindex, setDragindex] = useState(-1);
  let [dragok, setDragok] = useState(false);
  let [onedge, setOnedge] = useState(false);
  let [isinside,setIsinside] = useState(false)
  let [selected,setSelected]= useState(false)
  let [lineWidth,setLineWidth] = useState(2)
  let [strokeStyle ,setStrokeStyle] = useState("black")
  let [resizing,setResizing] = useState(false)
  let [selectionEdge,setSelectionEdge] = useState('')
  let selectedShapeIndex = useRef(-1)
  let [originalShape, setOriginalShape] = useState(null);
  
  
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
   
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctxRef.current = ctx;
  }, [strokeStyle,lineWidth]);

  useEffect(() => {
    redrawShapes();
  }, [shapes]);

  useEffect(() => {
    if(onedge){
      document.body.style.cursor = 'move'
    }else if(dragok || isinside){
      document.body.style.cursor = "grab" 
    }
    else{
 document.body.style.cursor = "default"
    }

  }, [onedge,dragok,isinside]);

  const redrawShapes = useCallback(() => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    shapes.forEach((shape,index) =>{ 
      let selected = index === selectedShapeIndex.current
      drawShape(ctx,shape,selected)});
  }, [shapes,selectedShapeIndex.current]);

  const drawShape = (ctx,shape,selected) => {
    const { tool, x, y, x1, y1 , lineWidth, strokeStyle  } = shape;
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    ctx.beginPath();
    switch (tool) {
      case 'Rectangle':
        ctx.strokeRect(x, y, x1 - x, y1-y);
        if(selected){
          SelectedShape(shape)
        }
        break;
      case 'Circle':
        const radius = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2));
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke()
        ctx.closePath()
        if(selected){
          SelectedShape(shape)
        }
        break;
      case 'Line':
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(shape.midx,shape.midy,x1,y1)
        ctx.stroke()
        if(selected){
          SelectedShape(shape)
        }
        break;
      case 'Pencil':
        ctx.moveTo(x, y);
        ctx.lineTo(x1, y1);
        ctx.stroke()
        break;
      case "Arrow":
      let dx = shape.x1 - shape.x
      let dy = shape.y1 - shape.y
      let angle = Math.atan2(dy, dx)
      let headlen = 15
      ctx.beginPath()
      ctx.moveTo(shape.x, shape.y)
      ctx.quadraticCurveTo(shape.midx,shape.midy,x1,y1)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(shape.x1, shape.y1)
      ctx.lineTo(shape.x1 - headlen * Math.cos(angle - Math.PI/6), shape.y1 - headlen * Math.sin(angle - Math.PI/6))
      ctx.moveTo(shape.x1,shape.y1)
      ctx.lineTo(shape.x1 - headlen * Math.cos(angle + Math.PI/6), shape.y1 - headlen * Math.sin(angle + Math.PI/6))
      ctx.stroke()
      if(selected){
          SelectedShape(shape)
        }
      break;
      default:
        break;
    }
    
  };
const resizingLogic = useCallback((mouseX, mouseY) => {
  const dx = mouseX - startPoint.current.x;
  const dy = mouseY - startPoint.current.y;
  const updateShapes = [...shapes];
  const newShape = { ...updateShapes[selectedShapeIndex.current] };

  const updateCoordinates = (xProp, yProp, x1Prop, y1Prop) => {
    let { [xProp]: x, [yProp]: y, [x1Prop]: x1, [y1Prop]: y1 } = newShape;

    switch (selectionEdge) {
      case "e-resize":
        x1 += dx;
        break;
      case "w-resize":
        x += dx;
        break;
      case "n-resize":
        y += dy;
        break;
      case "s-resize":
        y1 += dy;
        break;
      case "ne-resize":
        x1 += dx;
        y += dy;
        break;
      case "nw-resize":
        x += dx;
        y += dy;
        break;
      case "se-resize":
        x1 += dx;
        y1 += dy;
        break;
      case "sw-resize":
        x += dx;
        y1 += dy;
        break;
    }

    // Ensure x <= x1 and y <= y1
    if (x > x1) [x, x1] = [x1, x];
    if (y > y1) [y, y1] = [y1, y];

    newShape[xProp] = x;
    newShape[yProp] = y;
    newShape[x1Prop] = x1;
    newShape[y1Prop] = y1;
  };

  if (newShape.tool === "Rectangle") {
    updateCoordinates("x", "y", "x1", "y1");
  } else if (newShape.tool === "Line" || newShape.tool === "Arrow") {
    updateCoordinates("x", "y", "x1", "y1");
    newShape.midx = (newShape.x + newShape.x1) / 2;
    newShape.midy = (newShape.y + newShape.y1) / 2;
  }else if (newShape.tool === "Circle") {
    const centerX = (newShape.x + newShape.x1) / 2;
    const centerY = (newShape.y + newShape.y1) / 2;
    
    switch (selectionEdge) {
      case "e-resize":
      case "w-resize":
        const newWidth = Math.abs(newShape.x1 - newShape.x + dx);
        newShape.x = centerX - newWidth / 2;
        newShape.x1 = centerX + newWidth / 2;
        newShape.y = centerY - newWidth / 2;
        newShape.y1 = centerY + newWidth / 2;
        break;
      case "n-resize":
      case "s-resize":
        const newHeight = Math.abs(newShape.y1 - newShape.y + dy);
        newShape.x = centerX - newHeight / 2;
        newShape.x1 = centerX + newHeight / 2;
        newShape.y = centerY - newHeight / 2;
        newShape.y1 = centerY + newHeight / 2;
        break;
      case "ne-resize":
      case "nw-resize":
      case "se-resize":
      case "sw-resize":
        const newSize = Math.max(
          Math.abs(newShape.x1 - newShape.x + dx),
          Math.abs(newShape.y1 - newShape.y + dy)
        );
        newShape.x = centerX - newSize / 2;
        newShape.x1 = centerX + newSize / 2;
        newShape.y = centerY - newSize / 2;
        newShape.y1 = centerY + newSize / 2;
        break;
    }
  }

  updateShapes[selectedShapeIndex.current] = newShape;
 startPoint.current.x = mouseX
  startPoint.current.y = mouseY
  setShapes(updateShapes);
 
}, [shapes, selectedShapeIndex, selectionEdge, startPoint]);
 const isOnShapeEdge = useCallback((shape, x, y) => {
  const tolerance = 5;
  if (shape.tool === 'Rectangle') {
    const minX = Math.min(shape.x, shape.x1);
    const maxX = Math.max(shape.x, shape.x1);
    const minY = Math.min(shape.y, shape.y1);
    const maxY = Math.max(shape.y, shape.y1);
    return (
      (Math.abs(x - minX) <= tolerance && minY <= y && y <= maxY) ||
      (Math.abs(y - minY) <= tolerance && minX <= x && x <= maxX) ||
      (Math.abs(x - maxX) <= tolerance && minY <= y && y <= maxY) ||
      (Math.abs(y - maxY) <= tolerance && minX <= x && x <= maxX) 
    );
  } else if (shape.tool === 'Circle') {
    const radius = Math.sqrt(Math.pow(shape.x1 - shape.x, 2) + Math.pow(shape.y1 - shape.y, 2));
    const distance = Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2));
    return (Math.abs(distance - radius) <= tolerance);
  } else if (shape.tool === "Line" || shape.tool === "Arrow") {
    return isPointOnQuadraticCurve(shape.x, shape.y, shape.midx, shape.midy, shape.x1, shape.y1, x, y, tolerance);
  }
  return false;
}, []); 

const isInsideTheShape = (shape, x, y) => {
  const { x: shapeX, y: shapeY, x1: shapeX1, y1: shapeY1 } = shape;
  if (shape.tool === "Rectangle" || shape.tool === "Line" || shape.tool === "Arrow") {
    // Ensure correct comparison regardless of rectangle orientation
    const minX = Math.min(shapeX, shapeX1);
    const maxX = Math.max(shapeX, shapeX1);
    const minY = Math.min(shapeY, shapeY1);
    const maxY = Math.max(shapeY, shapeY1);
    return (x > minX && y > minY && x < maxX && y < maxY);
  } else if (shape.tool === "Circle") {
    const radius = Math.sqrt(Math.pow(shape.x1 - shape.x, 2) + Math.pow(shape.y1 - shape.y, 2));
    return ((Math.pow(x - shapeX, 2) + Math.pow(y - shapeY, 2)) < radius * radius);
  }
  return false;
}; 
  const SelectedShape = (shape)=>{
      const {tool,x,y,x1,y1} = shape
      
        const ctx = ctxRef.current
        ctx.save()
        ctx.setLineDash([6])
        ctx.lineWidth = 2
        ctx.strokeStyle ="#868e96"
        ctx.fillStyle = "#000000"
       if(tool=="Circle"){
        const radius = Math.sqrt((Math.pow(x1-x,2)+(Math.pow(y1-y,2))))
       
        ctx.strokeRect(x-radius-5,y-radius-5,(radius*2)+10,(radius*2)+10)
        
        ctx.beginPath()
        ctx.arc(x-radius-5,y-radius-5,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x-radius-5,y+radius+5,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x+radius+5,y-radius-5,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x+radius+5,y+radius+5,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.fill() 
        ctx.restore()   
        
       }else if(tool==="Rectangle"){
        const minX = Math.min(x, x1);
    const minY = Math.min(y, y1);
    const width = Math.abs(x1 - x);
    const height = Math.abs(y1 - y);
    
    ctx.strokeRect(minX - 10, minY - 10, width + 20, height + 20);
    ctx.closePath() 
    ctx.beginPath();
    ctx.arc(minX - 10, minY - 10, 5, 0, Math.PI * 2, true);
    ctx.closePath()
    ctx.arc(minX - 10, minY + height + 10, 5, 0, Math.PI * 2, true);
    ctx.closePath()
    ctx.arc(minX + width + 10, minY - 10, 5, 0, Math.PI * 2, true);
    ctx.closePath()
    ctx.arc(minX + width + 10, minY + height + 10, 5, 0, Math.PI * 2, true);
    ctx.closePath()
    ctx.fill();
    ctx.restore() 
       }else if(tool=="Line"){
        const width = x1 - x 
        const height = y1 -y
        ctx.strokeRect(x-10,y-10,width+20,height+20)
        ctx.closePath()
        ctx.arc(x-10,y-10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x-10,y+height+10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x+width+10,y-10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x1+10,y1+10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(shape.midx,shape.midy,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
       }else if(tool=="Arrow"){
        const width = x1 - x 
        const height = y1 -y
        ctx.strokeRect(x-10,y-10,width+20,height+20)
        ctx.closePath()
        ctx.arc(x-10,y-10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x-10,y+height+10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x+width+10,y-10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(x1+10,y1+10,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.arc(shape.midx,shape.midy,5,0,Math.PI*2,true)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
       }
  }
  const startDrawing = (e) => {
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;

    startPoint.current= ({ x: mouseX, y: mouseY });
    setEndPoint({ x: mouseX, y: mouseY });
    
    isDrawingRef.current = true;
    const SelectedShapeIndex = shapes.findIndex(shape => isOnShapeEdge(shape, mouseX, mouseY));
    let DargShapeIndex = -1
    let ResizingIndex = -1

    if(selected){
      DargShapeIndex = isInsideTheShape(shapes[selectedShapeIndex.current],mouseX,mouseY) ? selectedShapeIndex.current : -1
    } 
    if(selected){
      let forresizing = shapes[selectedShapeIndex.current]
      ResizingIndex = getonwhichedge(forresizing,mouseX,mouseY)!== 'default' ? selectedShapeIndex.current : -1
    }

  //when any of the shape is selected and mouse is down on the selected shape allow resizing 
  if(selectedShapeIndex.current !==-1 && selectedShapeIndex.current === ResizingIndex){
    isDrawingRef.current =false
    setResizing(true)
     setOriginalShape({ ...shapes[selectedShapeIndex.current] });
    
  }
  //when any of the shapes are not selected and (x,y) are on the shape
    if (SelectedShapeIndex !== -1 && selectedShapeIndex.current !== SelectedShapeIndex && !selected){
      isDrawingRef.current =false
      setSelected(true)
      selectedShapeIndex.current = SelectedShapeIndex
      redrawShapes()
    }  
  
 //when any shape is selected and (x,y) are inside the shape allow dragging
    if(selected && DargShapeIndex !==-1 && DargShapeIndex === selectedShapeIndex.current){
      setDragindex(selectedShapeIndex.current)
      setDragok(true)
      setResizing(false)
    }
    //when any shape is selected and (x,y) are not on any shape
    if(SelectedShapeIndex===-1 && selected && DargShapeIndex==-1 && ResizingIndex===-1 ){
      setSelected(false)
      selectedShapeIndex.current = -1
      redrawShapes()
    }
    //when shape is selected and (x,y) are on different shape
    if(SelectedShapeIndex !==-1 && selected && selectedShapeIndex.current !== SelectedShapeIndex){
      isDrawingRef.current =false
      selectedShapeIndex.current = SelectedShapeIndex
      redrawShapes() 
    }
    
  };

  const drawing = (e) => {
    const mouseX = e.nativeEvent.offsetX;
    const mouseY = e.nativeEvent.offsetY;
    setEndPoint({ x: mouseX, y: mouseY });
    if(!selected){
    setOnedge(shapes.some(shape => isOnShapeEdge(shape, mouseX, mouseY)));
    }
    if(selected && !dragok  ){
      let forresizing = shapes[selectedShapeIndex.current]
      
      const selectededge =  getonwhichedge(forresizing,mouseX,mouseY)
      setSelectionEdge(selectededge)
      document.body.style.cursor = selectededge 
    }

    if(selected ){
      const shape = shapes[selectedShapeIndex.current]
      setIsinside(isInsideTheShape(shape,mouseX,mouseY))
    }

    if (isDrawingRef.current) {
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      redrawShapes();
      tool === "Arrow" || tool==="Line"? 
      drawShape(ctx, { tool, x: startPoint.current.x, y: startPoint.current.y,midx:(startPoint.current.x + endPoint.x)/2,midy:
      (startPoint.current.y+ endPoint.y)/2,x1: mouseX, y1: mouseY ,lineWidth:lineWidth,strokeStyle:strokeStyle }):
      drawShape(ctx, { tool, x: startPoint.current.x, y: startPoint.current.y, x1: mouseX, y1: mouseY ,lineWidth:lineWidth,strokeStyle:strokeStyle });
    }else if (dragok) {
      const dx = mouseX - startPoint.current.x;
      const dy = mouseY - startPoint.current.y;
      const shape = shapes[selectedShapeIndex.current]
     
      shape.tool === "Arrow" || shape.tool === "Line" ?  
      setShapes(prevShapes => prevShapes.map((shape, index) => 
        index ===selectedShapeIndex.current 
          ? { ...shape, x: shape.x + dx, y: shape.y + dy,midx:shape.midx+dx,midy:shape.midy+dy ,x1: shape.x1 + dx, y1: shape.y1 + dy }
          : shape
      ))
 
     : setShapes(prevShapes => prevShapes.map((shape, index) => 
        index === selectedShapeIndex.current
          ? { ...shape, x: shape.x + dx, y: shape.y + dy, x1: shape.x1 + dx, y1: shape.y1 + dy }
          : shape
      ));
      
      startPoint.current= ({ x: mouseX, y: mouseY });
    }else if (resizing && originalShape) {
      
    resizingLogic(mouseX,mouseY) 
 
}
  
    };

  const stopDrawing = () => {
    if (isDrawingRef.current && !dragok && tool !== "") {
      if(tool == "Line" || tool=="Arrow"){
        const midX = (startPoint.current.x + endPoint.x)/2
        const midY = (startPoint.current.y + endPoint.y)/2
      setShapes(prevShapes => [
        ...prevShapes,
        { tool, x: startPoint.current.x, y: startPoint.current.y,midx:midX,midy:midY,x1:endPoint.x, y1:endPoint.y,lineWidth:lineWidth,strokeStyle:strokeStyle }
      ])
      }
      else{
      setShapes(prevShapes => [
        ...prevShapes,
        { tool, x: startPoint.current.x, y: startPoint.current.y, x1:endPoint.x, y1:endPoint.y,lineWidth:lineWidth,strokeStyle:strokeStyle }
      ]);
      
      }
      setTool("");
    }
    
    isDrawingRef.current = false;
    setResizing(false)
    setDragok(false);
    setDragindex(-1);

  };

  return (
    <>
      <div className='w-fit space-x-4'>
        <button className='p-4' onClick={() => setTool("Rectangle")}>Rectangle</button>
        <button className='p-4' onClick={() => setTool("Circle")}>Circle</button>
        <button className='p-4' onClick={() => setTool("Line")}>Line</button>
        <button className='p-4' onClick={() => setTool("Arrow")}>Arrow</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={drawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </>
  );
}

export default App;