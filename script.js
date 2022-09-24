window.onload = () => {
  const shader = {
    vertex: `    
    #ifdef GL_ES
    precision mediump float;
    #endif

    // those are the mandatory attributes that the lib sets
    attribute vec3 aVertexPosition;
    attribute vec2 aTextureCoord;

    // those are mandatory uniforms that the lib sets and that contain our model view and projection matrix
    uniform mat4 uMVMatrix;
    uniform mat4 uPMatrix;

    // our texture matrix that will handle image cover
    uniform mat4 texture_1Matrix;

    // if you want to pass your vertex and texture coords to the fragment shader
    varying vec3 vVertexPosition;
    varying vec2 vTextureCoord;

    void main() {
        vec3 vertexPosition = aVertexPosition;

        gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

        // set the varyings
        // here we use our texture matrix to calculate the accurate texture coords
        vTextureCoord = (texture_1Matrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
        vVertexPosition = vertexPosition;
    }
    `,
    fragment: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        #define PI 3.14159265359  

        // get our varyings
        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;

        // the uniform we declared inside our javascript
        uniform float uTime;
        uniform vec2 uReso;
        uniform vec3 uLight;
        uniform vec3 uFalloff;
        uniform vec4 uLightColor;
        uniform vec4 uAmbientColor;

        // our texture sampler (default name, to use a different name please refer to the documentation)
        uniform sampler2D texture_1;
        uniform sampler2D normalMap;

        void main() {
            vec2 uv = vTextureCoord;
            vec2 coord = gl_FragCoord.xy / uReso;
            
            vec2 st = (gl_FragCoord.xy - .5 * uReso.xy) / min(uReso.y, uReso.x);

            vec3 lightpos = uLight;

            float x = uv.y * PI * 2. + uTime * .4;
            float y = uv.x * PI * 2. + uTime * .2;

            vec2 dist = vec2(cos(x+y) * .01 * cos(y), sin(x-y) * .01 * cos(y));

            vec4 color = texture2D(texture_1, uv + dist);
            vec4 normal = texture2D(normalMap, uv + dist);

            vec3 LightVector = vec3(st.xy - lightpos.xy, lightpos.z);

            float d = length(LightVector);
            
            normal.xy -= .5;

            vec3 N = normalize(normal.xyz);
            vec3 L = normalize(LightVector);
      
            vec3 diffuse = (uLightColor.rgb * uLightColor.a) * max(dot( N, L ),0.);
            vec3 ambient = uAmbientColor.rgb * uAmbientColor.a;

            float attentuation =  1.0  / (uFalloff.x + (uFalloff.y * d) + (uFalloff.z * d * d));

            vec3 intensity = ambient + diffuse * attentuation;
            vec3 finalColor = color.rgb * intensity;
           
            gl_FragColor = vec4(finalColor, 1.);
        }
    `
  };

  // get our canvas wrapper
  const wrapper = document.getElementById("canvas");

  // set up our WebGL context and append the canvas to our wrapper
  const webGLCurtain = new Curtains("canvas");

  // get our plane element
  const planeElement = document.getElementsByClassName("plane")[0];

  // set our initial parameters (basic uniforms)
  const params = {
    vertexShader: shader.vertex, // our vertex shader ID
    fragmentShader: shader.fragment, // our framgent shader ID
    widthSegments: 40,
    heightSegments: 40, // we now have 40*40*6 = 9600 vertices !
    uniforms: {
      time: {
        name: "uTime", // uniform name that will be passed to our shaders
        type: "1f", // this means our uniform is a float
        value: 0
      },
      light: {
        name: "uLight",
        type: "3f",
        value: [0, 0, 0.1]
      },
      resolution: {
        name: "uReso",
        type: "2f",
        value: [innerWidth, innerHeight]
      },
      falloff: {
        name: "uFalloff",
        type: "3f",
        value: [0.5, 3, 20]
      },
      lightColor: {
        name: "uLightColor",
        type: "4f",
        value: [1, 0.8, 0.6, 1.5]
      },
      ambientColor: {
        name: "uAmbientColor",
        type: "4f",
        value: [0.6, 0.6, 1, 0.1]
      }
    }
  };

  // create our plane mesh
  const plane = webGLCurtain.addPlane(planeElement, params);

  // use the onRender method of our plane fired at each requestAnimationFrame call
  plane.onRender(() => {
    plane.uniforms.time.value += 0.02; // update our time uniform value
  });

  const onResize = () => {
    plane.uniforms.resolution.value = [innerWidth, innerHeight];
  };

  const onMouseMove = ev => {
    let ratio = innerHeight / innerWidth;

    const relPosX = (ev.clientX - innerWidth / 2) / innerWidth;
    const relPosY = (ev.clientY - innerHeight / 2) / innerHeight;

    const mouse =
      innerHeight > innerWidth
        ? { x: relPosX, y: relPosY * -1 * ratio }
        : { x: relPosX / ratio, y: relPosY * -1 };

    gsap.to(plane.uniforms.light.value, 1, {
      0: mouse.x,
      1: mouse.y
    });
  };

  const onMouseDown = () => {
    gsap.to(plane.uniforms.lightColor.value, 2, {
      3: 0.0
    });

    gsap.to(plane.uniforms.ambientColor.value, 2, {
      3: 0.0
    });
  };

  const onMouseUp = () => {
    gsap.to(plane.uniforms.lightColor.value, 2, {
      3: 1.5
    });

    TweenMax.to(plane.uniforms.ambientColor.value, 2, {
      3: 0.1
    });
  };

  const title = document.querySelector(".text");
  title.style.animation = "reveal 3s ease-out forwards";

  wrapper.addEventListener("mousedown", onMouseDown);
  wrapper.addEventListener("mouseup", onMouseUp);
  wrapper.addEventListener("mousemove", ev => onMouseMove(ev));
  window.addEventListener("resize", onResize);
};