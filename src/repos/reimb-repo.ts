import {Reimbursements} from '../models/reimb';
import {InternalServerError, BadRequestError}from '../errors/errors';
import {PoolClient} from 'pg';
import {connectionPool} from '..';
import { isPropertyOf, isValidObject } from '../util/validators';

export class ReimbRepository{
	baseQuery = `select * from full_reimbursements_info`;

	/**
	 * method used to get all Reimbursements directly from the database
	 */
	async getAll(): Promise<Reimbursements[]>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let sql = `${this.baseQuery}`;
			let rs = await client.query(sql)
			return rs.rows;
		}catch(e){
			throw new InternalServerError();
		}finally{
			client && client.release();
		}
	}

	/**
	 * get 1 Reimbursements based of the reimb_id directly from the database
	 * @param id 
	 */
	async getById(id: number): Promise<Reimbursements>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let sql = `${this.baseQuery} where reimb_id = $1`
			let rs = await client.query(sql, [id])
			return rs.rows[0];
		}catch(e){
			throw new InternalServerError();
		} finally {
			client && client.release();
		}
	}

	/**
	 * gets all the Reimbursements based off the Id of the user. 
	 * @param id 
	 */
	async getAllById(id: number): Promise<Reimbursements[]>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let sql = `${this.baseQuery} where author_id = $1`
			let rs = await client.query(sql, [id])
			
			return rs.rows;
		}catch(e){
			throw new InternalServerError();
		} finally {
			client && client.release();
		}
	}

	/**
	 * get 1 Reimbursements based off the unique keys of the Reimbursements
	 * @param key 
	 * @param val 
	 */
	async getReimbByUniqueKey(key: string, val: string): Promise<Reimbursements>{
		let client: PoolClient
		try{
			client = await connectionPool.connect();
			let sql = `${this.baseQuery} where full_reimbursements_info.${key} = $1`;
			let rs = await client.query(sql, [val]);
			return rs.rows[0];
		}catch(e){
			throw new InternalServerError();
		}finally{
			client && client.release();
		}
	}

	/**
	 * get all the Reimbursements based on the type of Reimbursements
	 * @param type 
	 */
	async getAllByType(type: string): Promise<Reimbursements[]>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let sql = `${this.baseQuery} where reimb_type = $1 `;
			let rs = await client.query(sql, [type]);
			return rs.rows
		}catch(e){
			throw new InternalServerError();
		} finally {
			client && client.release();
		}
	}

	/**
	 * get all Reimbursements based off th status of the Reimbursements
	 * @param status 
	 */
	async getAllByStatus(status: string): Promise<Reimbursements[]>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let sql = `${this.baseQuery} where reimb_status = $1 `;
			let rs = await client.query(sql, [status]);
			return rs.rows
		}catch(e){
			throw new InternalServerError();
		} finally{
			client && client.release();
		}
	}

	/**
	 * Updates the user state. Only need the reimb_id, the updated status, and the resolver_id
	 * @param reimb_id 
	 * @param updateStatus 
	 * @param resolver_id 
	 */
	async updateStatus(reimb_id: number, updateStatus: string, resolver_id: number):  Promise<boolean>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let status_id = (await client.query('select reimb_status_id from ers_reimbursement_statuses where reimb_status = $1',[updateStatus])).rows[0].reimb_status_id;
			let currentTime = new Date()
			let sql = 'update ers_reimbursements set resolved = $2, resolver_id = $3, reimb_status_id = $4 where reimb_id = $1';
			await client.query(sql,[reimb_id, currentTime, resolver_id, status_id]);
			return true;
		}catch(e){
			throw new InternalServerError();
		}finally{
			client && client.release();
		}
	}

	/**
	 * updates the Reimbursements
	 * @param reimb_id 
	 * @param amount 
	 * @param description 
	 * @param reimb_type 
	 */
	async update(reimb_id: number,amount: number, description: string, reimb_type: string): Promise<boolean>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let type_id = (await client.query('select reimb_type_id from ers_reimbursement_types where reimb_type = $1',[reimb_type])).rows[0].reimb_type_id
			let sql = 'update ers_reimbursements set amount = $2, description = $3, reimb_type_id = $4 where reimb_id = $1';
			await client.query(sql,[reimb_id, amount, description, type_id]);
			return true;
		}catch(e){
			throw new InternalServerError();
		}finally{
			client && client.release()
		}
	}

	/**
	 * saves a brand new reimb to the database. 
	 * Returns the reimb when completed.
	 * @param reimb 
	 */
	async saveReimb(reimb: Reimbursements): Promise<Reimbursements>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let statusPending = 2;
			let type_id = (await client.query('select reimb_type_id from ers_reimbursement_types where reimb_type = $1',[reimb.reimb_type])).rows[0].reimb_type_id
			let sql = `insert into ers_reimbursements  (amount , submitted ,resolved ,description ,author_id , resolver_id , reimb_status_id, reimb_type_id)
			values($1, $2, $3, $4,$5,$6,$7,$8) returning reimb_id;`;
			let rs = await client.query(sql, [reimb.amount,reimb.submitted, reimb.resolved, reimb.description, reimb.author_id, reimb.resolver_id, statusPending , type_id]);
			reimb.reimb_id = rs.rows[0].reimb_id;
			return reimb;
		}catch(e){
			throw new InternalServerError();
		}finally{
			client && client.release();
		}
	}

	/**
	 * deletes a user by given a user Id
	 * returns true when successfully updated
	 * @param id 
	 */
	async deleteById(id:number): Promise<boolean>{
		let client: PoolClient;
		try{
			client = await connectionPool.connect();
			let sql = 'delete from ers_reimbursements where reimb_id = $1;';
			let rs = await client.query(sql, [id]);
			return rs.rows[0];
		}catch(e){
			throw new InternalServerError();
		}finally{
			client && client.release();
		}
	}

}
