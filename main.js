document.addEventListener('DOMContentLoaded', function () {
    // HTMLからcanvas要素を取得する
    const canvas = document.getElementById('canvas');
    canvas.width = 1260;
    canvas.height = 520;

    // canvas要素からwebglコンテキストを取得する
    const gl = canvas.getContext('webgl');
    // WebGLコンテキストが取得できたかどうか調べる
    if (!gl) {
        alert('webgl not supported!');
        return;
    }
    // canvasを初期化する色を設定する
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // canvasを初期化する際の深度を設定する
    gl.clearDepth(1.0);
    // canvasを初期化する
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 頂点シェーダとフラグメントシェーダの生成
    const v_shader = create_shader('vertexShader');
    const f_shader = create_shader('fragmentShader');
    
    // プログラムオブジェクトの生成とリンク
    const prg = create_program(v_shader, f_shader);
    
    let attLocation = new Array(2);
    // attributeLocationの取得、positionが何番目のAttributeかを返す
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'color');
    
    
    let attStride = new Array(2);
    // attribute1の要素数(この場合は xyz の3要素)
    attStride[0] = 3;
    attStride[1] = 4;
    
    /*
    // モデル(頂点)データ
    let vertex_position = [
         0.0, 1.0, 0.0,
         1.0, 0.0, 0.0,
        -1.0, 0.0, 0.0,
         0.0, -1.0, 0.0
    ];

    // 頂点の色情報を格納する配列
    let vertex_color = [
        1.0, 0.0, 0.0, 1.0,
        0.0, 1.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0
    ]
    */

    //const vertex = torus(20, 50, 0.2, 1.0);
    const vertex = stripedShpere(1, 21, 20);

    const vertex_position = vertex[0];
    const vertex_color = vertex[1];
    const index = vertex[2];
    // VBOの生成
    let position_vbo = create_vbo(vertex_position);
    let color_vbo = create_vbo(vertex_color);

    // VBOを登録
    set_attribute([position_vbo, color_vbo], attLocation, attStride);
    /*
    // インデックスデータ配列
    const index = [
        0, 1, 2,
        1, 3, 2
    ];
    */

    // IBOの生成
    const ibo = create_ibo(index);

    // IBOをバインドして登録する
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    // uniformLocationの取得　prgオブジェクトにあるシェーダのuniform変数’mvpMatrix’がuniform変数の中で何番目のものかを取得
    let uniLocation = gl.getUniformLocation(prg, 'mvpMatrix');

    // minMatrix.js を用いた行列関連処理
    // matIVオブジェクトを生成
    let m = new matIV();
    
    // 各種行列の生成と初期化
    let mMatrix = m.identity(m.create());
    let vMatrix = m.identity(m.create());
    let pMatrix = m.identity(m.create());
    let tmpMatrix = m.identity(m.create());
    let mvpMatrix = m.identity(m.create());
    
    // ビュー座標変換行列
    m.lookAt([0.0, 0.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
    // プロジェクション座標変換行列
    m.perspective(90, canvas.width / canvas.height, 0.1, 100, pMatrix);
    // ビュー×プロジェクション座標変換行列を完成させる
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    // カリングを有効に
    gl.enable(gl.CULL_FACE);
    // 深度テストを有効に
    gl.enable(gl.DEPTH_TEST);
    // 深度テストの評価方法の指定
    gl.depthFunc(gl.LEQUAL);
    

    // カウンタの宣言
    let count = 0;

    // 恒常ループ
    (function(){
        // canvasを初期化
        gl.clearColor(0.0, 0.0, 0.0, 0.5);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        count++;

        const rad1 = (count % 360) * Math.PI / 180;
        const rad2 = ((count + 90) % 360) * Math.PI / 180;

        m.identity(mMatrix);
        m.translate(mMatrix, [0.5, 0.0, 0.0], mMatrix);
        m.rotate(mMatrix, rad1, [0.5, 0.5, 0], mMatrix);

        // モデル1の座標変換行列を完成させレンダリングする
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        // フラグメントシェーダのuniformLovationへ座標変換行列を登録する（一つ目のモデル）
        gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
        
        // モデル2はY軸を中心に回転する
        m.identity(mMatrix);
        m.translate(mMatrix, [-0.5, 0.0, 0.0], mMatrix);
        m.rotate(mMatrix, rad2, [0, 0.5, 0.5], mMatrix);

        // モデル2の座標変換行列を完成させレンダリングする
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
        
        // コンテキストの再描画
        gl.flush();
        
        // ループのために再帰呼び出し
        setTimeout(arguments.callee, 1000 / 50);
    })();


    // シェーダを生成する関数
    function create_shader(id){
        // シェーダを格納する変数
        let shader;
        
        // HTMLからscriptタグへの参照を取得
        let scriptElement = document.getElementById(id);
        
        // scriptタグが存在しない場合は抜ける
        if(!scriptElement){return;}
        
        // scriptタグのtype属性をチェック
        switch(scriptElement.type){
            
            // 頂点シェーダの場合
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
                
            // フラグメントシェーダの場合
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return;
        }
        
        // 生成されたシェーダにソースを割り当てる
        gl.shaderSource(shader, scriptElement.text);
        
        // シェーダをコンパイルする
        gl.compileShader(shader);
        
        // シェーダが正しくコンパイルされたかチェック
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            
            // 成功していたらシェーダを返して終了
            return shader;
        }else{
            
            // 失敗していたらエラーログをアラートする
            alert(gl.getShaderInfoLog(shader));
        }
    }

    // プログラムオブジェクトを生成しシェーダをリンクする関数
    // プログラムオブジェクトとは、頂点シェーダからフラグメントシェーダ、またWebGLプログラムと各シェーダとのデータのやり取りを管理するオブジェクト
    function create_program(vs, fs){
        // プログラムオブジェクトの生成
        let program = gl.createProgram();
        
        // プログラムオブジェクトにシェーダを割り当てる
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        
        
        // シェーダをリンク
        gl.linkProgram(program);
        
        // シェーダのリンクが正しく行なわれたかチェック
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
        
            // 成功していたらプログラムオブジェクトを有効にする
            gl.useProgram(program);
            
            // プログラムオブジェクトを返して終了
            return program;
        }else{
            
            // 失敗していたらエラーログをアラートする
            alert(gl.getProgramInfoLog(program));
        }
    }

    // VBOを生成する関数
    // 頂点バッファは頂点に関する情報を保存できる記憶領域であり、ここに転送されたデータが、紐づけられたattribute変数に渡される
    function create_vbo(data){
        // バッファオブジェクトの生成
        let vbo = gl.createBuffer();
        
        // WebGLにバッファをバインドする。こうすることで、バッファを（WebGLから？）操作できる
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        
        // バッファにデータをセット
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        
        // バッファのバインドを無効化。WebGLにバインドできるバッファは一度につき一つだけだから。
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        // 生成した VBO を返して終了
        return vbo;
    }

    // VBOをバインドし登録する関数
    function set_attribute(vbo, attL, attS){
        // 引数として受け取った配列を処理する
        for(let i in vbo){
            // WebGLにVBOをバインド
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);

            // attribute属性を有効にする
            gl.enableVertexAttribArray(attL[i]);

            // attribute属性を登録、VBOからシェーダにデータを渡す
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    // IBOを生成する関数
    function create_ibo(data){
        // バッファオブジェクトの生成
        const ibo = gl.createBuffer();

        // バッファをバインドする
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

        // バッファにデータをセット
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

        // バッファのバインドを無効化
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // 生成したIBOを返して終了
        return ibo;
    }

    // トーラスのモデルデータを生成する関数
    function torus(row, column, irad, orad){
        let pos = new Array(), col = new Array(), idx = new Array();
        for(let i = 0; i <= row; i++)
        {
            // 輪を作る
            let r = 2 * Math.PI  * i / row; // 半径1の円のラジアン
            let rr = Math.cos(r);           // x座標
            let ry = Math.sin(r);           // y座標
            for(let ii = 0; ii <= column; ii++)
            {
                // 管を作る
                let tr = 2 * Math.PI * ii / column;
                let tx = (rr * irad + orad) * Math.cos(tr);
                let ty = ry * irad;
                let tz = (rr * irad + orad) * Math.sin(tr);
                pos.push(tx, ty, tz);
                let tc = hsva(360 / column * ii, 1, 1, 1);
                col.push(tc[0], tc[1], tc[2], tc[3]); 
            }
        }
        for(i = 0; i < row; i++)
        {
            for(ii = 0; ii < column; ii++)
            {
                r = (column + 1) * i + ii;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r + 1);
            }
        }
        return [pos, col, idx];
    }

    function hsva(h, s, v, a){
        if(s > 1 || v > 1 || a > 1){return;}
        const th = h % 360;
        const i = Math.floor(th / 60);
        const f = th / 60 - i;
        const m = v * (1 - s);
        const n = v * (1 - s * f);
        const k = v * (1 - s * (1 - f));
        const color = new Array();
        if(!s > 0 && !s < 0){
            color.push(v, v, v, a); 
        } else {
            const r = new Array(v, n, m, m, k, v);
            const g = new Array(k, v, v, n, m, m);
            const b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }
        return color;
    }

    // 縞模様の球体を自作
    function stripedShpere(radius, frequency, roundness)
    {
        let pos = new Array(), col = new Array(), idx = new Array();
        for(let i = 1; i < frequency; i++)
        {
            const y_ratio = parseFloat(i) / frequency;  // 0<y_ration<1をとるy座標
            const y = 2.0 * radius * y_ratio;           // 0<y<2radius
            const y_radius = Math.sqrt(radius * radius - (radius - y) * (radius - y));
            for(let ii = 0; ii <= roundness; ii++)
            {
                const circle = 2 * Math.PI * ii / roundness;
                const tx = y_radius * Math.cos(circle);
                const ty = y - radius;
                const tz = y_radius * Math.sin(circle);
                pos.push(tx, ty, tz);
                const tc = hsva(360 / roundness * ii, 1, 1, 1);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }
        
        for(let i = 0; i < (frequency) / 2; i++)
        {
            for(let ii = 0; ii < roundness; ii++)
            {
                r = ii + 2 * i * (roundness + 1);
                idx.push(r, r + roundness + 1, r + roundness + 2);
                idx.push(r, r + roundness + 2, r + 1);    
            }
        }
        return [pos, col, idx];

    }
});