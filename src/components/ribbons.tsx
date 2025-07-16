'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { mat4 } from 'gl-matrix';

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
        } : null;
    };

    const parsedColors = React.useMemo(() => colors.map(hexToRgb).filter(c => c !== null) as {r:number, g:number, b:number}[], [colors]);

    const setupWebGL = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return false;

        const gl = canvas.getContext('webgl', { alpha: true });
        if (!gl) {
            console.error("WebGL not supported");
            return false;
        }
        glRef.current = gl;

        const createShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if(!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
            console.error(`Error compiling shader: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        };

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        if (!vertexShader || !fragmentShader) return false;

        const program = gl.createProgram();
        if(!program) return false;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            programRef.current = program;
            positionAttributeLocationRef.current = gl.getAttribLocation(program, "a_position");
            matrixUniformLocationRef.current = gl.getUniformLocation(program, "u_matrix");
            colorUniformLocationRef.current = gl.getUniformLocation(program, "u_color");
            positionBufferRef.current = gl.createBuffer();
            return true;
        } else {
            console.error(`Error linking program: ${gl.getProgramInfoLog(program)}`);
            gl.deleteProgram(program);
            return false;
        }
    }, []);

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = glRef.current;
        const ctx = enableShaderEffect ? null : canvas.getContext('2d');

        if ((!ctx && !gl)) {
            animationFrameId.current = requestAnimationFrame(animate);
            return;
        }

        const w = canvas.width;
        const h = canvas.height;

        if (ctx) {
            ctx.clearRect(0, 0, w, h);
        } else if (gl) {
            gl.viewport(0, 0, w, h);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        if (ribbonsRef.current.length < 50 && Math.random() < 0.2 && parsedColors.length > 0) {
             const color = parsedColors[Math.floor(Math.random() * parsedColors.length)];
             const startY = Math.random() * h;
             ribbonsRef.current.push({
                points: [{ x: -baseThickness, y: startY }],
                thickness: baseThickness * (Math.random() * 0.5 + 0.75),
                color: { ...color },
                speed: (Math.random() * 0.5 + 0.2) * speedMultiplier,
                age: 0,
                maxAge: maxAge,
             });
        }
        
        const newRibbons: any[] = [];
        ribbonsRef.current.forEach(ribbon => {
            const lastPoint = ribbon.points[ribbon.points.length - 1];
            const newX = lastPoint.x + ribbon.speed * 10;
            const newY = lastPoint.y + (Math.sin(lastPoint.x / 50 + ribbon.age / 10) * 2);
            ribbon.points.push({ x: newX, y: newY });
            ribbon.age++;

            if (lastPoint.x > w + ribbon.thickness || ribbon.age > ribbon.maxAge) {
                return;
            }
            newRibbons.push(ribbon);

            let alpha = 1.0;
            if (enableFade) {
                if (ribbon.age < 50) alpha = ribbon.age / 50;
                else if (ribbon.age > ribbon.maxAge - 50) alpha = (ribbon.maxAge - ribbon.age) / 50;
            }

            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(ribbon.points[0].x, ribbon.points[0].y);
                for (let i = 1; i < ribbon.points.length; i++) {
                    ctx.lineTo(ribbon.points[i].x, ribbon.points[i].y);
                }
                ctx.lineWidth = ribbon.thickness;
                ctx.strokeStyle = `rgba(${ribbon.color.r},${ribbon.color.g},${ribbon.color.b},${alpha})`;
                ctx.stroke();
            } else if (gl && programRef.current && positionBufferRef.current) {
                const program = programRef.current;
                const positionBuffer = positionBufferRef.current;
                const positionLocation = positionAttributeLocationRef.current;
                const matrixLocation = matrixUniformLocationRef.current;
                const colorLocation = colorUniformLocationRef.current;

                gl.useProgram(program);
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.enableVertexAttribArray(positionLocation);
                gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

                const positions = [];
                for(let i=0; i<ribbon.points.length -1; i++){
                    const p1 = ribbon.points[i];
                    const p2 = ribbon.points[i+1];
                    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                    const t = ribbon.thickness / 2;

                    positions.push(p1.x - Math.sin(angle) * t, p1.y + Math.cos(angle) * t);
                    positions.push(p1.x + Math.sin(angle) * t, p1.y - Math.cos(angle) * t);
                    positions.push(p2.x - Math.sin(angle) * t, p2.y + Math.cos(angle) * t);
                    
                    positions.push(p2.x - Math.sin(angle) * t, p2.y + Math.cos(angle) * t);
                    positions.push(p1.x + Math.sin(angle) * t, p1.y - Math.cos(angle) * t);
                    positions.push(p2.x + Math.sin(angle) * t, p2.y - Math.cos(angle) * t);
                }
                
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
                
                const projectionMatrix = mat4.create();
                mat4.ortho(projectionMatrix, 0, w, h, 0, -1, 1);
                gl.uniformMatrix4fv(matrixLocation, false, projectionMatrix);
                
                gl.uniform4f(colorLocation, ribbon.color.r / 255, ribbon.color.g / 255, ribbon.color.b / 255, alpha);

                gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
            }
        });
        ribbonsRef.current = newRibbons;

        animationFrameId.current = requestAnimationFrame(animate);
    }, [baseThickness, speedMultiplier, maxAge, enableFade, enableShaderEffect, parsedColors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                canvas.width = width;
                canvas.height = height;
            }
        });
        resizeObserver.observe(canvas);

        let didSetup = true;
        if (enableShaderEffect) {
            didSetup = setupWebGL();
        }

        if (didSetup) {
            animationFrameId.current = requestAnimationFrame(animate);
        }

        return () => {
            resizeObserver.disconnect();
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
