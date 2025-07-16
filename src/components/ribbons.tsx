'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { mat4, vec3 } from 'gl-matrix';

const vertexShaderSource = `
    attribute vec4 a_position;
    uniform mat4 u_matrix;
    void main() {
        gl_Position = u_matrix * a_position;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
        gl_FragColor = u_color;
    }
`;

interface RibbonsProps {
    baseThickness?: number;
    colors?: string[];
    speedMultiplier?: number;
    maxAge?: number;
    enableFade?: boolean;
    enableShaderEffect?: boolean;
}

const Ribbons: React.FC<RibbonsProps> = ({
    baseThickness = 30,
    colors = ['#FF0000', '#00FF00', '#0000FF'],
    speedMultiplier = 1,
    maxAge = 300,
    enableFade = true,
    enableShaderEffect = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const positionAttributeLocationRef = useRef<number>(-1);
    const matrixUniformLocationRef = useRef<WebGLUniformLocation | null>(null);
    const colorUniformLocationRef = useRef<WebGLUniformLocation | null>(null);
    const positionBufferRef = useRef<WebGLBuffer | null>(null);

    const ribbonsRef = useRef<any[]>([]);
    const animationFrameId = useRef<number>();
    
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : {r:0,g:0,b:0};
    };

    const parsedColors = colors.map(hexToRgb);

    const setupWebGL = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error("WebGL not supported");
            return;
        }
        glRef.current = gl;

        const createShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if(!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
            if (success) return shader;
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        };

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) return;

        const program = gl.createProgram();
        if(!program) return;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            programRef.current = program;
            positionAttributeLocationRef.current = gl.getAttribLocation(program, "a_position");
            matrixUniformLocationRef.current = gl.getUniformLocation(program, "u_matrix");
            colorUniformLocationRef.current = gl.getUniformLocation(program, "u_color");
            positionBufferRef.current = gl.createBuffer();
        } else {
            console.error(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
        }
    }, []);


    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        const gl = glRef.current;
        const ctx = enableShaderEffect ? null : canvas?.getContext('2d');
        const ribbons = ribbonsRef.current;
        const w = canvas?.width ?? 0;
        const h = canvas?.height ?? 0;

        if ((!ctx && !gl) || !canvas) {
            animationFrameId.current = requestAnimationFrame(animate);
            return;
        }

        if (ctx) { // 2D rendering
            ctx.clearRect(0, 0, w, h);
        } else if (gl) { // WebGL rendering
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 0); // Transparent background
            gl.clear(gl.COLOR_BUFFER_BIT);
        }


        if (ribbons.length < 50 && Math.random() < 0.2) {
             const color = parsedColors[Math.floor(Math.random() * parsedColors.length)];
             const startY = Math.random() * h;
             const newRibbon = {
                points: [{ x: -baseThickness, y: startY }],
                thickness: baseThickness,
                color: `rgba(${color.r},${color.g},${color.b},`,
                speed: (Math.random() * 0.5 + 0.2) * speedMultiplier,
                age: 0,
                maxAge: maxAge,
             };
             ribbons.push(newRibbon);
        }

        ribbons.forEach((ribbon, index) => {
            const lastPoint = ribbon.points[ribbon.points.length - 1];
            const newX = lastPoint.x + ribbon.speed * 10;
            const newY = lastPoint.y + (Math.sin(lastPoint.x / 50) * 2);
            ribbon.points.push({ x: newX, y: newY });
            
            ribbon.age++;

            if (lastPoint.x > w + ribbon.thickness || ribbon.age > ribbon.maxAge) {
                ribbons.splice(index, 1);
            }

            let alpha = 1.0;
            if (enableFade) {
                if (ribbon.age < 50) {
                    alpha = ribbon.age / 50;
                } else if (ribbon.age > ribbon.maxAge - 50) {
                    alpha = (ribbon.maxAge - ribbon.age) / 50;
                }
            }
            const colorWithAlpha = `${ribbon.color}${alpha})`;

            if (ctx) { // 2D rendering
                ctx.beginPath();
                ctx.moveTo(ribbon.points[0].x, ribbon.points[0].y);
                for (let i = 1; i < ribbon.points.length; i++) {
                    ctx.lineTo(ribbon.points[i].x, ribbon.points[i].y);
                }
                ctx.lineWidth = ribbon.thickness;
                ctx.strokeStyle = colorWithAlpha;
                ctx.stroke();
            } else if (gl && programRef.current && positionBufferRef.current) { // WebGL rendering
                 const program = programRef.current;
                 const positionBuffer = positionBufferRef.current;
                 const colorUniformLocation = colorUniformLocationRef.current;

                gl.useProgram(program);
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

                const positions = [];
                for(let i=0; i<ribbon.points.length -1; i++){
                    const p1 = ribbon.points[i];
                    const p2 = ribbon.points[i+1];
                    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                    const t = ribbon.thickness / 2;

                    const x1a = p1.x - Math.sin(angle) * t;
                    const y1a = p1.y + Math.cos(angle) * t;
                    const x1b = p1.x + Math.sin(angle) * t;
                    const y1b = p1.y - Math.cos(angle) * t;

                    const x2a = p2.x - Math.sin(angle) * t;
                    const y2a = p2.y + Math.cos(angle) * t;
                    const x2b = p2.x + Math.sin(angle) * t;
                    const y2b = p2.y - Math.cos(angle) * t;
                    
                    positions.push(x1a, y1a, x1b, y1b, x2a, y2a, x2a, y2a, x1b, y1b, x2b, y2b);
                }
                
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
                
                gl.enableVertexAttribArray(positionAttributeLocationRef.current);
                gl.vertexAttribPointer(positionAttributeLocationRef.current, 2, gl.FLOAT, false, 0, 0);
                
                const projectionMatrix = mat4.create();
                mat4.ortho(projectionMatrix, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, -1, 1);
                gl.uniformMatrix4fv(matrixUniformLocationRef.current, false, projectionMatrix);
                
                const rgb = hexToRgb(colors[index % colors.length] || '#ffffff');
                gl.uniform4f(colorUniformLocation, rgb.r / 255, rgb.g / 255, rgb.b / 255, alpha);

                gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
            }
        });

        animationFrameId.current = requestAnimationFrame(animate);
    }, [baseThickness, speedMultiplier, maxAge, enableFade, enableShaderEffect, parsedColors, colors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        if (enableShaderEffect) {
            setupWebGL();
        }

        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [animate, enableShaderEffect, setupWebGL]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
};

export default Ribbons;
