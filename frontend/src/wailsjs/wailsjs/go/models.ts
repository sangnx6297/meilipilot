export namespace main {
	
	export class ForwardResult {
	    status: number;
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new ForwardResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.body = source["body"];
	    }
	}
	export class ProfileDTO {
	    id: string;
	    name: string;
	    host: string;
	    environment: string;
	    readOnly: boolean;
	    hasKey: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ProfileDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.host = source["host"];
	        this.environment = source["environment"];
	        this.readOnly = source["readOnly"];
	        this.hasKey = source["hasKey"];
	    }
	}
	export class SessionDTO {
	    id: string;
	    host: string;
	    name: string;
	    environment: string;
	    readOnly: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SessionDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.host = source["host"];
	        this.name = source["name"];
	        this.environment = source["environment"];
	        this.readOnly = source["readOnly"];
	    }
	}

}

